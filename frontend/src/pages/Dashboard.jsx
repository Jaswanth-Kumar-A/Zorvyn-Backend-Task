import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import api from "../api/axios";
import styles from "./Dashboard.module.css";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const PIE_COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#ef4444", "#f97316"];

function summarizeFromRecords(records) {
  const normalized = records.map((record) => ({
    id: `record-${record.id}`,
    amount: Number(record.amount || 0),
    type: record.type || "expense",
    category: record.title || "General",
    date: String(record.created_at || "").slice(0, 10),
    notes: record.description || null
  }));

  const totalIncome = normalized
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = normalized
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const categoryMap = new Map();
  normalized.forEach((item) => {
    categoryMap.set(item.category, Number(categoryMap.get(item.category) || 0) + item.amount);
  });

  const monthMap = new Map();
  normalized.forEach((item) => {
    const month = String(item.date || "").slice(0, 7);
    if (!month) return;
    if (!monthMap.has(month)) {
      monthMap.set(month, { month, total_income: 0, total_expense: 0 });
    }
    const row = monthMap.get(month);
    if (item.type === "income") {
      row.total_income += item.amount;
    } else {
      row.total_expense += item.amount;
    }
  });

  const byCategory = Array.from(categoryMap.entries()).map(([category, total_amount]) => ({
    category,
    total_amount
  }));

  const monthlyTrend = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  const recentTransactions = normalized
    .slice()
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 10);

  return {
    summary: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_balance: totalIncome - totalExpenses
    },
    byCategory,
    monthlyTrend,
    recentTransactions
  };
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0, net_balance: 0 });
  const [byCategory, setByCategory] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      setError("");

      try {
        const [summaryRes, categoryRes, trendRes, recentRes, recordsRes] = await Promise.all([
          api.get("/dashboard/summary"),
          api.get("/dashboard/by-category"),
          api.get("/dashboard/monthly-trend"),
          api.get("/dashboard/recent"),
          api.get("/records")
        ]);

        const apiSummary = summaryRes.data || {};
        const apiByCategory = Array.isArray(categoryRes.data) ? categoryRes.data : [];
        const apiMonthly = Array.isArray(trendRes.data) ? trendRes.data : [];
        const apiRecent = Array.isArray(recentRes.data) ? recentRes.data : [];
        const records = Array.isArray(recordsRes.data) ? recordsRes.data : [];

        const hasApiData =
          Number(apiSummary.total_income || 0) !== 0 ||
          Number(apiSummary.total_expenses || 0) !== 0 ||
          apiByCategory.length > 0 ||
          apiMonthly.length > 0 ||
          apiRecent.length > 0;

        if (!hasApiData && records.length > 0) {
          const derived = summarizeFromRecords(records);
          setSummary(derived.summary);
          setByCategory(derived.byCategory);
          setMonthlyTrend(derived.monthlyTrend);
          setRecentTransactions(derived.recentTransactions);
        } else {
          setSummary(apiSummary);
          setByCategory(apiByCategory);
          setMonthlyTrend(apiMonthly);
          setRecentTransactions(apiRecent);
        }
      } catch (err) {
        const message =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to load dashboard data.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const cards = useMemo(
    () => [
      { label: "Total Income", value: summary.total_income, tone: styles.income },
      { label: "Total Expenses", value: summary.total_expenses, tone: styles.expense },
      { label: "Net Balance", value: summary.net_balance, tone: styles.balance }
    ],
    [summary]
  );

  if (loading) {
    return <div className={styles.state}>Loading dashboard...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.cardsGrid}>
        {cards.map((card) => (
          <article key={card.label} className={`${styles.card} ${card.tone}`}>
            <p className={styles.cardLabel}>{card.label}</p>
            <h3 className={styles.cardValue}>{money.format(Number(card.value || 0))}</h3>
          </article>
        ))}
      </section>

      <section className={styles.chartsGrid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Monthly Income vs Expense</h3>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                <XAxis dataKey="month" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    borderColor: "rgba(148, 163, 184, 0.35)",
                    color: "#e2e8f0"
                  }}
                />
                <Legend />
                <Bar dataKey="total_income" name="Income" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="total_expense" name="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Category Wise Totals</h3>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                <Pie
                  data={byCategory}
                  dataKey="total_amount"
                  nameKey="category"
                  cx="35%"
                  cy="50%"
                  outerRadius={76}
                  label={false}
                  labelLine={false}
                >
                  {byCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, payload) => {
                    const label = payload?.payload?.category || "Amount";
                    return [money.format(Number(value || 0)), label];
                  }}
                  contentStyle={{
                    background: "#0f172a",
                    borderColor: "rgba(148, 163, 184, 0.35)",
                    color: "#e2e8f0"
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  wrapperStyle={{ color: "#e2e8f0", fontSize: "13px", lineHeight: "1.35" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Recent Transactions</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className={styles.emptyRow}>
                    No recent transactions found.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>{txn.date}</td>
                    <td className={txn.type === "income" ? styles.incomeText : styles.expenseText}>
                      {txn.type}
                    </td>
                    <td>{txn.category}</td>
                    <td>{money.format(Number(txn.amount || 0))}</td>
                    <td>{txn.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

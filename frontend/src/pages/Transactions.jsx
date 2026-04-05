import { useCallback, useMemo, useState } from "react";
import { useEffect } from "react";

import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import styles from "./Transactions.module.css";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const emptyForm = {
  amount: "",
  type: "expense",
  category: "",
  date: "",
  notes: ""
};

function mapRecordToTransaction(record) {
  return {
    id: `record-${record.id}`,
    amount: Number(record.amount || 0),
    type: record.type || "expense",
    category: record.title || "General",
    date: String(record.created_at || "").slice(0, 10),
    notes: record.description || null,
    source: "record"
  };
}

export default function Transactions() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skip, setSkip] = useState(0);
  const [limit] = useState(10);
  const [hasNext, setHasNext] = useState(false);

  const [filters, setFilters] = useState({
    type: "",
    category: "",
    startDate: "",
    endDate: ""
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const page = useMemo(() => Math.floor(skip / limit) + 1, [skip, limit]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        skip,
        limit
      };

      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;

      const response = await api.get("/transactions/", { params });
      let rows = Array.isArray(response.data) ? response.data : [];

      if (rows.length === 0) {
        const recordsRes = await api.get("/records");
        const recordRows = Array.isArray(recordsRes.data) ? recordsRes.data.map(mapRecordToTransaction) : [];

        if (filters.type) {
          rows = recordRows.filter((item) => item.type === filters.type);
        } else {
          rows = recordRows;
        }

        if (filters.category) {
          const categoryNeedle = String(filters.category).toLowerCase();
          rows = rows.filter((item) => String(item.category || "").toLowerCase().includes(categoryNeedle));
        }

        if (filters.startDate) {
          rows = rows.filter((item) => String(item.date || "") >= filters.startDate);
        }

        if (filters.endDate) {
          rows = rows.filter((item) => String(item.date || "") <= filters.endDate);
        }

        rows = rows
          .slice()
          .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

        setHasNext(skip + limit < rows.length);
        rows = rows.slice(skip, skip + limit);
      } else {
        setHasNext(rows.length === limit);
      }

      setTransactions(rows);
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to fetch transactions.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, skip, limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setSkip(0);
    fetchTransactions();
  };

  const clearFilters = () => {
    setFilters({ type: "", category: "", startDate: "", endDate: "" });
    setSkip(0);
  };

  const openCreate = () => {
    setEditingTxn(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (txn) => {
    setEditingTxn(txn);
    setForm({
      amount: txn.amount,
      type: txn.type,
      category: txn.category,
      date: txn.date,
      notes: txn.notes || ""
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSubmitting(false);
    setEditingTxn(null);
    setForm(emptyForm);
  };

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onModalSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      amount: Number(form.amount),
      type: form.type,
      category: form.category,
      date: form.date,
      notes: form.notes || null
    };

    try {
      if (editingTxn) {
        await api.put(`/transactions/${editingTxn.id}`, payload);
      } else {
        await api.post("/transactions/", payload);
      }
      closeModal();
      fetchTransactions();
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Transaction operation failed.";
      setError(message);
      setSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    if (String(id).startsWith("record-")) {
      setError("Delete this item from the Records page.");
      return;
    }

    const confirmed = window.confirm("Soft delete this transaction?");
    if (!confirmed) return;

    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to delete transaction.";
      setError(message);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <h2 className={styles.title}>Transactions</h2>
        {isAdmin ? (
          <button className={styles.primaryButton} onClick={openCreate} type="button">
            Add Transaction
          </button>
        ) : null}
      </div>

      <section className={styles.panel}>
        <div className={styles.filterGrid}>
          <select name="type" value={filters.type} onChange={onFilterChange} className={styles.input}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <input
            className={styles.input}
            name="category"
            value={filters.category}
            onChange={onFilterChange}
            placeholder="Category"
          />

          <input
            className={styles.input}
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={onFilterChange}
          />

          <input
            className={styles.input}
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={onFilterChange}
          />

          <button className={styles.primaryButton} onClick={applyFilters} type="button">
            Apply
          </button>
          <button className={styles.secondaryButton} onClick={clearFilters} type="button">
            Reset
          </button>
        </div>
      </section>

      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.panel}>
        {loading ? (
          <div className={styles.state}>Loading transactions...</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  {isAdmin ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className={styles.emptyRow}>
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td>{txn.date}</td>
                      <td className={txn.type === "income" ? styles.incomeText : styles.expenseText}>
                        {txn.type}
                      </td>
                      <td>{txn.category}</td>
                      <td>{money.format(Number(txn.amount || 0))}</td>
                      <td>{txn.notes || "-"}</td>
                      {isAdmin ? (
                        <td>
                          <div className={styles.actionRow}>
                            <button
                              className={styles.smallButton}
                              onClick={() => openEdit(txn)}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className={styles.smallDanger}
                              onClick={() => onDelete(txn.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.pagination}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => setSkip((prev) => Math.max(0, prev - limit))}
            disabled={skip === 0}
          >
            Previous
          </button>
          <span className={styles.pageTag}>Page {page}</span>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => setSkip((prev) => prev + limit)}
            disabled={!hasNext}
          >
            Next
          </button>
        </div>
      </section>

      {modalOpen ? (
        <div className={styles.modalOverlay}>
          <form className={styles.modalCard} onSubmit={onModalSubmit}>
            <h3 className={styles.modalTitle}>{editingTxn ? "Edit Transaction" : "Add Transaction"}</h3>

            <label className={styles.label}>Amount</label>
            <input
              className={styles.input}
              type="number"
              step="0.01"
              name="amount"
              value={form.amount}
              onChange={onFormChange}
              required
            />

            <label className={styles.label}>Type</label>
            <select className={styles.input} name="type" value={form.type} onChange={onFormChange} required>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <label className={styles.label}>Category</label>
            <input
              className={styles.input}
              name="category"
              value={form.category}
              onChange={onFormChange}
              required
            />

            <label className={styles.label}>Date</label>
            <input
              className={styles.input}
              type="date"
              name="date"
              value={form.date}
              onChange={onFormChange}
              required
            />

            <label className={styles.label}>Notes</label>
            <textarea className={styles.input} name="notes" value={form.notes} onChange={onFormChange} />

            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} type="button" onClick={closeModal}>
                Cancel
              </button>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

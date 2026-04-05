import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import styles from "./Records.module.css";

const rupee = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const emptyForm = {
  title: "",
  amount: "",
  type: "income",
  description: ""
};

export default function Records() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;

      const response = await api.get("/records", { params });
      setRecords(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to fetch financial records.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totals = useMemo(() => {
    const totalIncome = records
      .filter((record) => record.type === "income")
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const totalExpense = records
      .filter((record) => record.type === "expense")
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [records]);

  const cards = [
    { label: "Total Income", value: totals.totalIncome, tone: styles.incomeCard },
    { label: "Total Expenses", value: totals.totalExpense, tone: styles.expenseCard },
    { label: "Balance", value: totals.balance, tone: styles.balanceCard }
  ];

  const onFilterChange = (event) => setTypeFilter(event.target.value);

  const openCreate = () => {
    setEditingRecord(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setForm({
      title: record.title,
      amount: record.amount,
      type: record.type,
      description: record.description || ""
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSubmitting(false);
    setEditingRecord(null);
    setForm(emptyForm);
  };

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      amount: Number(form.amount),
      type: form.type,
      description: form.description.trim() || null
    };

    try {
      if (editingRecord) {
        await api.put(`/records/${editingRecord.id}`, payload);
      } else {
        await api.post("/records", payload);
      }
      closeModal();
      fetchRecords();
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Unable to save record.";
      setError(message);
      setSubmitting(false);
    }
  };

  const onDelete = async (record) => {
    if (!window.confirm(`Delete ${record.title}?`)) return;

    try {
      await api.delete(`/records/${record.id}`);
      fetchRecords();
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Unable to delete record.";
      setError(message);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>Financial Records</h2>
          <p className={styles.subtitle}>Create, view, edit, and delete income and expense records.</p>
        </div>

        {isAdmin ? (
          <button className={styles.primaryButton} type="button" onClick={openCreate}>
            Add Record
          </button>
        ) : null}
      </div>

      <section className={styles.summaryGrid}>
        {cards.map((card) => (
          <article key={card.label} className={`${styles.summaryCard} ${card.tone}`}>
            <span className={styles.summaryLabel}>{card.label}</span>
            <strong className={styles.summaryValue}>{rupee.format(card.value)}</strong>
          </article>
        ))}
      </section>

      <section className={styles.panel}>
        <div className={styles.filterBar}>
          <label className={styles.filterLabel} htmlFor="typeFilter">
            Filter by type
          </label>
          <select id="typeFilter" value={typeFilter} onChange={onFilterChange} className={styles.select}>
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
      </section>

      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.panel}>
        {loading ? (
          <div className={styles.state}>Loading records...</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Created At</th>
                  {isAdmin ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className={styles.emptyRow}>
                      No records found.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.title}</td>
                      <td>{rupee.format(Number(record.amount || 0))}</td>
                      <td>
                        <span className={`${styles.badge} ${record.type === "income" ? styles.incomeBadge : styles.expenseBadge}`}>
                          {record.type}
                        </span>
                      </td>
                      <td>{record.description || "-"}</td>
                      <td>{record.created_at ? new Date(record.created_at).toLocaleString() : "-"}</td>
                      {isAdmin ? (
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.smallButton} type="button" onClick={() => openEdit(record)}>
                              Edit
                            </button>
                            <button className={styles.smallDanger} type="button" onClick={() => onDelete(record)}>
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
      </section>

      {modalOpen ? (
        <div className={styles.modalOverlay}>
          <form className={styles.modalCard} onSubmit={onSubmit}>
            <h3 className={styles.modalTitle}>{editingRecord ? "Edit Record" : "Add Record"}</h3>

            <label className={styles.label} htmlFor="title">
              Title
            </label>
            <input id="title" className={styles.input} name="title" value={form.title} onChange={onFormChange} required />

            <label className={styles.label} htmlFor="amount">
              Amount
            </label>
            <input
              id="amount"
              className={styles.input}
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              value={form.amount}
              onChange={onFormChange}
              required
            />

            <label className={styles.label} htmlFor="recordType">
              Type
            </label>
            <select id="recordType" className={styles.input} name="type" value={form.type} onChange={onFormChange} required>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <label className={styles.label} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className={styles.input}
              name="description"
              value={form.description}
              onChange={onFormChange}
              rows="4"
            />

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

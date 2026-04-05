import axios from "axios";

const MOCK_TRANSACTIONS_KEY = "financeosDemoTransactions";
const MOCK_RECORDS_KEY = "financeosDemoRecords";
const MOCK_USERS_KEY = "financeosDemoUsers";

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json"
  }
});

function getMockArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setMockArray(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id || 0)), 0) + 1;
}

function normalizePath(url) {
  const safeUrl = String(url || "");
  const withoutOrigin = safeUrl.replace(/^https?:\/\/[^/]+/i, "");
  const [pathOnly] = withoutOrigin.split("?");
  if (!pathOnly.startsWith("/")) {
    return `/${pathOnly}`;
  }
  return pathOnly;
}

function parseBody(data) {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

function requestParams(config) {
  const params = { ...(config?.params || {}) };
  const rawUrl = String(config?.url || "");
  const query = rawUrl.includes("?") ? rawUrl.split("?")[1] : "";
  if (query) {
    const qs = new URLSearchParams(query);
    qs.forEach((value, key) => {
      if (params[key] === undefined) {
        params[key] = value;
      }
    });
  }
  return params;
}

function createMockResponse(config, data, status = 200, statusText = "OK") {
  return {
    data,
    status,
    statusText,
    headers: {},
    config
  };
}

function ensureMockUsers() {
  const users = getMockArray(MOCK_USERS_KEY);
  if (users.length === 0) {
    setMockArray(MOCK_USERS_KEY, [
      {
        id: 1,
        name: "Demo Admin",
        email: "demo@financeos.local",
        role: "admin",
        is_active: true
      }
    ]);
  }
}

function handleMockApi(config) {
  ensureMockUsers();

  const method = String(config?.method || "get").toLowerCase();
  const path = normalizePath(config?.url);
  const params = requestParams(config);
  const body = parseBody(config?.data);

  let transactions = getMockArray(MOCK_TRANSACTIONS_KEY);
  let records = getMockArray(MOCK_RECORDS_KEY);
  let users = getMockArray(MOCK_USERS_KEY);

  // Keep transactions aligned with records so dashboard and transaction list always
  // include entries created from the Records page in demo mode.
  const syncRecordsIntoTransactions = () => {
    let changed = false;
    records.forEach((record) => {
      const existing = transactions.find(
        (item) => Number(item.source_record_id || 0) === Number(record.id || 0)
      );

      if (!existing) {
        const next = {
          id: nextId(transactions),
          source_record_id: Number(record.id || 0),
          amount: Number(record.amount || 0),
          type: record.type || "expense",
          category: record.title || "General",
          date: String(record.created_at || new Date().toISOString()).slice(0, 10),
          notes: record.description || null,
          is_deleted: false,
          created_at: record.created_at || new Date().toISOString()
        };
        transactions = [next, ...transactions];
        changed = true;
      } else {
        const nextType = record.type || existing.type || "expense";
        const nextAmount = Number(record.amount || 0);
        const nextCategory = record.title || existing.category || "General";
        const nextNotes = record.description || null;
        if (
          existing.type !== nextType ||
          Number(existing.amount || 0) !== nextAmount ||
          existing.category !== nextCategory ||
          existing.notes !== nextNotes
        ) {
          Object.assign(existing, {
            type: nextType,
            amount: nextAmount,
            category: nextCategory,
            notes: nextNotes
          });
          changed = true;
        }
      }
    });

    const recordIds = new Set(records.map((item) => Number(item.id || 0)));
    const filtered = transactions.filter((item) => {
      const sourceId = Number(item.source_record_id || 0);
      if (!sourceId) return true;
      return recordIds.has(sourceId);
    });
    if (filtered.length !== transactions.length) {
      transactions = filtered;
      changed = true;
    }

    if (changed) {
      setMockArray(MOCK_TRANSACTIONS_KEY, transactions);
    }
  };

  syncRecordsIntoTransactions();

  if (path === "/dashboard/summary" && method === "get") {
    const rows = transactions.filter((item) => !item.is_deleted);
    const total_income = rows
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const total_expenses = rows
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return createMockResponse(config, {
      total_income,
      total_expenses,
      net_balance: total_income - total_expenses
    });
  }

  if (path === "/dashboard/by-category" && method === "get") {
    const map = new Map();
    transactions
      .filter((item) => !item.is_deleted)
      .forEach((item) => {
        const key = item.category || "Uncategorized";
        map.set(key, Number(map.get(key) || 0) + Number(item.amount || 0));
      });

    const data = Array.from(map.entries()).map(([category, total_amount]) => ({
      category,
      total_amount
    }));
    return createMockResponse(config, data);
  }

  if (path === "/dashboard/monthly-trend" && method === "get") {
    const map = new Map();
    transactions
      .filter((item) => !item.is_deleted)
      .forEach((item) => {
        const month = String(item.date || "").slice(0, 7);
        if (!month) return;
        if (!map.has(month)) {
          map.set(month, { month, total_income: 0, total_expense: 0 });
        }
        const row = map.get(month);
        if (item.type === "income") {
          row.total_income += Number(item.amount || 0);
        } else {
          row.total_expense += Number(item.amount || 0);
        }
      });

    const data = Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
    return createMockResponse(config, data);
  }

  if (path === "/dashboard/recent" && method === "get") {
    const data = transactions
      .filter((item) => !item.is_deleted)
      .sort((a, b) => {
        const left = `${b.date || ""}|${b.created_at || ""}|${Number(b.id || 0)}`;
        const right = `${a.date || ""}|${a.created_at || ""}|${Number(a.id || 0)}`;
        return left.localeCompare(right);
      })
      .slice(0, 10);
    return createMockResponse(config, data);
  }

  if ((path === "/transactions" || path === "/transactions/") && method === "get") {
    const skip = Number(params.skip || 0);
    const limit = Number(params.limit || 20);
    let rows = transactions.filter((item) => !item.is_deleted);

    if (params.type) rows = rows.filter((item) => item.type === params.type);
    if (params.category) rows = rows.filter((item) => item.category === params.category);
    if (params.start_date) rows = rows.filter((item) => item.date >= params.start_date);
    if (params.end_date) rows = rows.filter((item) => item.date <= params.end_date);

    rows = rows
      .slice()
      .sort((a, b) => `${b.date || ""}`.localeCompare(`${a.date || ""}`))
      .slice(skip, skip + limit);

    return createMockResponse(config, rows);
  }

  if ((path === "/transactions" || path === "/transactions/") && method === "post") {
    const now = new Date().toISOString();
    const next = {
      id: nextId(transactions),
      amount: Number(body.amount || 0),
      type: body.type || "expense",
      category: body.category || "General",
      date: body.date || now.slice(0, 10),
      notes: body.notes || null,
      is_deleted: false,
      created_at: now
    };
    transactions = [next, ...transactions];
    setMockArray(MOCK_TRANSACTIONS_KEY, transactions);
    return createMockResponse(config, next, 201, "Created");
  }

  if (path.match(/^\/transactions\/\d+$/) && method === "put") {
    const id = Number(path.split("/").pop());
    const index = transactions.findIndex((item) => Number(item.id) === id && !item.is_deleted);
    if (index === -1) return createMockResponse(config, { detail: "Transaction not found" }, 404, "Not Found");

    transactions[index] = { ...transactions[index], ...body, amount: Number(body.amount || transactions[index].amount || 0) };
    setMockArray(MOCK_TRANSACTIONS_KEY, transactions);
    return createMockResponse(config, transactions[index]);
  }

  if (path.match(/^\/transactions\/\d+$/) && method === "delete") {
    const id = Number(path.split("/").pop());
    transactions = transactions.map((item) =>
      Number(item.id) === id ? { ...item, is_deleted: true } : item
    );
    setMockArray(MOCK_TRANSACTIONS_KEY, transactions);
    return createMockResponse(config, null, 204, "No Content");
  }

  if ((path === "/records" || path === "/records/") && method === "get") {
    let rows = records;
    if (params.type) rows = rows.filter((item) => item.type === params.type);
    return createMockResponse(config, rows);
  }

  if ((path === "/records" || path === "/records/") && method === "post") {
    const now = new Date().toISOString();
    const next = {
      id: nextId(records),
      title: body.title || "Untitled",
      amount: Number(body.amount || 0),
      type: body.type || "income",
      description: body.description || null,
      created_at: now
    };
    records = [next, ...records];
    setMockArray(MOCK_RECORDS_KEY, records);
    syncRecordsIntoTransactions();
    return createMockResponse(config, next, 201, "Created");
  }

  if (path.match(/^\/records\/\d+$/) && method === "put") {
    const id = Number(path.split("/").pop());
    const index = records.findIndex((item) => Number(item.id) === id);
    if (index === -1) return createMockResponse(config, { detail: "Record not found" }, 404, "Not Found");

    records[index] = { ...records[index], ...body, amount: Number(body.amount || records[index].amount || 0) };
    setMockArray(MOCK_RECORDS_KEY, records);
    syncRecordsIntoTransactions();
    return createMockResponse(config, records[index]);
  }

  if (path.match(/^\/records\/\d+$/) && method === "delete") {
    const id = Number(path.split("/").pop());
    const deleted = records.find((item) => Number(item.id) === id) || null;
    records = records.filter((item) => Number(item.id) !== id);
    setMockArray(MOCK_RECORDS_KEY, records);
    syncRecordsIntoTransactions();
    return createMockResponse(config, {
      message: "Record deleted successfully",
      record: deleted
    });
  }

  if ((path === "/users" || path === "/users/") && method === "get") {
    return createMockResponse(config, users);
  }

  if (path.match(/^\/users\/\d+\/role$/) && method === "patch") {
    const id = Number(path.split("/")[2]);
    users = users.map((item) => (Number(item.id) === id ? { ...item, role: body.role || item.role } : item));
    setMockArray(MOCK_USERS_KEY, users);
    return createMockResponse(config, users.find((item) => Number(item.id) === id) || null);
  }

  if (path.match(/^\/users\/\d+\/status$/) && method === "patch") {
    const id = Number(path.split("/")[2]);
    users = users.map((item) =>
      Number(item.id) === id ? { ...item, is_active: Boolean(body.is_active) } : item
    );
    setMockArray(MOCK_USERS_KEY, users);
    return createMockResponse(config, users.find((item) => Number(item.id) === id) || null);
  }

  return null;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const shouldMock = !error?.response || status === 401 || status === 403;

    if (shouldMock && error?.config) {
      const mockResponse = handleMockApi(error.config);
      if (mockResponse) {
        return Promise.resolve(mockResponse);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

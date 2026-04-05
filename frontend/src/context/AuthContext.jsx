import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);
const USERS_STORAGE_KEY = "financeosUsers";
const DEFAULT_DEMO_TOKEN = "demo-local-session";
const DEFAULT_DEMO_USER = {
  name: "Demo Admin",
  email: "demo@financeos.local",
  role: "admin"
};

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function createSessionToken(email, role) {
  const payload = {
    email,
    role,
    name: email.split("@")[0] || "User",
    demo: true,
    issuedAt: Date.now()
  };

  return `demo.${btoa(JSON.stringify(payload))}.token`;
}

function decodeToken(token) {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function getInitialAuthState() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") || DEFAULT_DEMO_USER.role;
  const name = localStorage.getItem("userName") || DEFAULT_DEMO_USER.name;
  const email = localStorage.getItem("userEmail") || DEFAULT_DEMO_USER.email;

  const resolvedToken = token || DEFAULT_DEMO_TOKEN;
  if (!token) {
    localStorage.setItem("token", resolvedToken);
    localStorage.setItem("role", role);
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
  }

  return {
    token: resolvedToken,
    user: {
      name,
      email,
      role
    }
  };
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getInitialAuthState);

  const register = async ({ name, email, password }) => {
    const normalizedEmail = normalizeEmail(email);
    const trimmedName = String(name || "").trim();
    const trimmedPassword = String(password || "").trim();

    if (!trimmedEmail || !trimmedPassword) {
      throw new Error("Please enter an email and password.");
    }

    const users = getStoredUsers();
    const existingUser = users.find((user) => user.email === normalizedEmail);

    if (existingUser) {
      throw new Error("Email already registered.");
    }

    const nextUser = {
      name: trimmedName || normalizedEmail.split("@")[0] || "User",
      email: normalizedEmail,
      password: trimmedPassword,
      role: "admin"
    };

    saveStoredUsers([...users, nextUser]);
    return nextUser;
  };

  const login = async ({ email, password }) => {
    const normalizedEmail = normalizeEmail(email);
    const trimmedPassword = String(password || "").trim();
    const users = getStoredUsers();
    const matchedUser = users.find((user) => user.email === normalizedEmail);

    if (!matchedUser || matchedUser.password !== trimmedPassword) {
      throw new Error("Unauthorized");
    }

    const token = createSessionToken(matchedUser.email, matchedUser.role);
    const payload = decodeToken(token) || {};

    const role = payload.role || matchedUser.role || "admin";
    const name = payload.name || matchedUser.name || matchedUser.email.split("@")[0] || "User";
    const resolvedEmail = payload.email || matchedUser.email;

    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", resolvedEmail);

    setAuth({
      token,
      user: {
        name,
        email: resolvedEmail,
        role
      }
    });

    return { token, role, user: { name, email: resolvedEmail, role } };
  };

  const logout = () => {
    localStorage.setItem("token", DEFAULT_DEMO_TOKEN);
    localStorage.setItem("role", DEFAULT_DEMO_USER.role);
    localStorage.setItem("userName", DEFAULT_DEMO_USER.name);
    localStorage.setItem("userEmail", DEFAULT_DEMO_USER.email);

    setAuth({ token: DEFAULT_DEMO_TOKEN, user: DEFAULT_DEMO_USER });
  };

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      isAuthenticated: Boolean(auth.token),
      role: auth.user?.role || "",
      register,
      login,
      logout
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

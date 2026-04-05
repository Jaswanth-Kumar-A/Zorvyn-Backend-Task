import { NavLink } from "react-router-dom";

import styles from "./Sidebar.module.css";

import { useAuth } from "../context/AuthContext";

export default function Sidebar({ open, onClose }) {
  const { role } = useAuth();

  const links = [
    { to: "/dashboard", label: "Dashboard", roles: ["viewer", "analyst", "admin"] },
    { to: "/records", label: "Records", roles: ["viewer", "analyst", "admin"] },
    { to: "/transactions", label: "Transactions", roles: ["viewer", "analyst", "admin"] }
  ].filter((item) => item.roles.includes(role));

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>FinanceOS</h2>
        <button className={styles.closeButton} onClick={onClose} type="button">
          Close
        </button>
      </div>

      <nav className={styles.nav}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.linkActive : ""}`.trim()
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

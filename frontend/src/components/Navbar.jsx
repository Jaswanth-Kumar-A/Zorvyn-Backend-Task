import styles from "./Navbar.module.css";

export default function Navbar({ onToggleSidebar }) {
  return (
    <header className={styles.navbar}>
      <button className={styles.menuButton} onClick={onToggleSidebar} type="button">
        Menu
      </button>

      <h1 className={styles.navTitle}>FinanceOS Dashboard</h1>
    </header>
  );
}

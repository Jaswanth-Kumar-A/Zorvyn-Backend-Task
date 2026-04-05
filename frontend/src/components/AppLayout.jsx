import { Outlet } from "react-router-dom";
import { useState } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.backdrop} hidden={!sidebarOpen} onClick={() => setSidebarOpen(false)} />

      <div className={styles.mainColumn}>
        <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

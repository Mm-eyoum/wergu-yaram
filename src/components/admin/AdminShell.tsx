import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

const COLLAPSE_KEY = "wy-admin-sidebar-collapsed";

/**
 * Admin back-office layout: persistent sidebar + topbar, dark-mode aware.
 * Mounted behind a role guard in App.tsx; child routes render via <Outlet />.
 */
export function AdminShell() {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_KEY) === "1",
  );

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-surface-page dark:bg-[#0a1430]">
      <aside className="sticky top-0 hidden h-screen md:block">
        <AdminSidebar collapsed={collapsed} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main id="main" className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

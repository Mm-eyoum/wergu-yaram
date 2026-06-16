import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  Search,
  ExternalLink,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABELS } from "@/lib/constants";
import { ADMIN_NAV } from "./adminNav";

/** Current section label derived from the active admin route. */
function useSectionLabel() {
  const { pathname } = useLocation();
  const match = [...ADMIN_NAV]
    .filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? "Administration";
}

export function AdminTopbar({
  collapsed,
  onToggleSidebar,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const section = useSectionLabel();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-black/5 bg-white px-4 dark:border-white/10 dark:bg-brand-navy">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
        className="grid h-9 w-9 place-items-center rounded-xl text-text-secondary hover:bg-brand-soft dark:text-white/70 dark:hover:bg-white/5"
      >
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm">
        <Link to="/admin" className="text-text-secondary hover:text-brand-green dark:text-white/60">
          Admin
        </Link>
        {section !== "Tableau de bord" && (
          <>
            <ChevronRight className="h-4 w-4 text-text-secondary/50" />
            <span className="font-semibold text-text-primary dark:text-white">{section}</span>
          </>
        )}
      </nav>

      {/* Global search stub (Cmd+K — wired in a later phase) */}
      <button
        type="button"
        onClick={() => navigate("/admin")}
        className="ml-auto hidden items-center gap-2 rounded-xl border border-black/10 px-3 py-1.5 text-sm text-text-secondary hover:bg-brand-soft md:flex dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
      >
        <Search className="h-4 w-4" />
        <span>Rechercher…</span>
        <kbd className="rounded bg-brand-soft px-1.5 text-[10px] dark:bg-white/10">⌘K</kbd>
      </button>

      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="hidden items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-brand-soft md:flex dark:text-white/70 dark:hover:bg-white/5 ml-0"
      >
        <ExternalLink className="h-4 w-4" /> Voir le site
      </a>

      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
        className="grid h-9 w-9 place-items-center rounded-xl text-text-secondary hover:bg-brand-soft dark:text-white/70 dark:hover:bg-white/5"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* User menu */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xl p-1 hover:bg-brand-soft dark:hover:bg-white/5"
        >
          <Avatar name={user?.displayName ?? "Admin"} src={user?.photoURL} size="sm" />
          <span className="hidden text-left lg:block">
            <span className="block max-w-[10rem] truncate text-sm font-semibold text-text-primary dark:text-white">
              {user?.displayName ?? "Administrateur"}
            </span>
            <span className="block text-xs text-text-secondary dark:text-white/50">
              {user ? ROLE_LABELS[user.role] : ""}
            </span>
          </span>
        </button>

        {menuOpen && (
          <div className={cn(
            "absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-black/5 bg-white py-1 shadow-card dark:border-white/10 dark:bg-brand-navy",
          )}>
            <Link
              to="/dashboard"
              className="block px-4 py-2 text-sm text-text-primary hover:bg-brand-soft dark:text-white/80 dark:hover:bg-white/5"
              onClick={() => setMenuOpen(false)}
            >
              Mon tableau de bord
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-danger hover:bg-brand-soft dark:hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

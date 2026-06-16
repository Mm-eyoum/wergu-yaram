import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";
import { Logo } from "@/components/ui/Logo";
import { ADMIN_NAV } from "./adminNav";

/**
 * Admin left navigation. Filters items by the signed-in role and renders
 * not-yet-built destinations as disabled "Bientôt" rows. Collapses to an
 * icon rail when `collapsed`.
 */
export function AdminSidebar({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const items = ADMIN_NAV.filter((item) => can(user?.role, item.permission));

  return (
    <nav
      aria-label="Navigation administration"
      className={cn(
        "flex h-full flex-col border-r border-black/5 bg-white transition-all dark:border-white/10 dark:bg-brand-navy",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-black/5 px-4 dark:border-white/10", collapsed && "justify-center px-0")}>
        {collapsed ? (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-green font-extrabold text-white">W</span>
        ) : (
          <Logo className="h-8" />
        )}
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const Icon = item.icon;
          if (!item.ready) {
            return (
              <li key={item.key}>
                <span
                  className={cn(
                    "flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary/60 dark:text-white/40",
                    collapsed && "justify-center px-0",
                  )}
                  title={collapsed ? `${item.label} — bientôt` : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!collapsed && (
                    <span className="rounded-full bg-brand-mint px-1.5 py-0.5 text-[10px] font-semibold text-brand-green dark:bg-white/10 dark:text-white/70">
                      Bientôt
                    </span>
                  )}
                </span>
              </li>
            );
          }
          return (
            <li key={item.key}>
              <NavLink
                to={item.to}
                end={item.to === "/admin"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-brand-mint text-brand-green dark:bg-white/10 dark:text-white"
                      : "text-text-primary hover:bg-brand-soft dark:text-white/80 dark:hover:bg-white/5",
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

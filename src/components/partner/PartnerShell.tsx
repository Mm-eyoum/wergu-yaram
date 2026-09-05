import { NavLink, Outlet, useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchTenantForManager } from "@/services/tenants";
import { PARTNER_NAV } from "./partnerNav";

/**
 * Partner sub-platform layout: branded sidebar (tenant accent) + content area.
 * Child routes render via <Outlet />. Mounted behind PartnerProtectedRoute.
 */
export function PartnerShell() {
  const { slug } = useParams();
  const base = `/espace/${slug}/gestion`;
  const { data: tenant } = useQuery({
    queryKey: ["partner", "tenant", slug],
    queryFn: () => fetchTenantForManager(slug!),
    enabled: !!slug,
  });
  const accent = { color: "var(--tenant-accent, #007A5E)" };

  return (
    <div className="flex min-h-screen bg-surface-page dark:bg-[#0a1430]">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-black/5 bg-white p-4 md:block dark:border-white/10 dark:bg-[#0b1430]">
        <div className="mb-6 px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Espace partenaire</p>
          <p className="truncate text-lg font-extrabold" style={accent}>{tenant?.name ?? slug}</p>
        </div>
        <nav className="space-y-1">
          {PARTNER_NAV.map((item) => (
            <NavLink
              key={item.key}
              to={item.segment ? `${base}/${item.segment}` : base}
              end={!item.segment}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-mint text-brand-green dark:bg-white/10 dark:text-white"
                    : "text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
                }`
              }
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 space-y-2 border-t border-black/5 pt-4 dark:border-white/10">
          <Link to={`/partenaires/${slug}`} className="flex items-center gap-1.5 px-3 text-xs text-text-secondary hover:text-brand-green">
            <ExternalLink className="h-3.5 w-3.5" /> Voir l'espace public
          </Link>
          <Link to="/" className="flex items-center gap-1.5 px-3 text-xs text-text-secondary hover:text-brand-green">
            <ArrowLeft className="h-3.5 w-3.5" /> Wergu Yaram
          </Link>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}

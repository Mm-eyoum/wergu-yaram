import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ExternalLink, Menu, Settings, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useTenantSpace } from "@/hooks/useTenantSpace";
import { initials } from "@/lib/format";
import { accentTheme } from "@/lib/tenantTheme";
import { resolveTenantCta } from "@/lib/tenantCta";
import { getSiteUrl } from "@/seo/siteUrl";
import { TenantCtaLink } from "./TenantUI";
import { TENANT_NAV } from "./tenantNav";

/**
 * White-label header for a partner micro-site. Replaces the Wergu Yaram portal
 * header on a partner sub-domain: partner logo + name, space navigation, the
 * adaptive primary CTA (accent), and a discreet "powered by" link.
 */
export function TenantHeader() {
  const { tenant, slug } = useTenant();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { needs, communities } = useTenantSpace(slug ?? undefined, tenant);

  const name = tenant?.name ?? "Espace partenaire";
  const logo = tenant?.logo;
  const theme = accentTheme(tenant?.theme?.accent);
  const cta = resolveTenantCta({ needs, communities, tenant });
  const isManager =
    !!user && !!tenant && (tenant.ownerUid === user.uid || !!tenant.managerUids?.includes(user.uid));

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-soft ring-1 ring-border-soft"
            style={{ color: theme.solid }}
          >
            {logo ? (
              <img src={logo} alt={name} className="max-h-7 max-w-[30px] object-contain" />
            ) : (
              <span className="text-sm font-extrabold">{initials(name)}</span>
            )}
          </span>
          <span className="truncate text-base font-extrabold text-text-primary">{name}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {TENANT_NAV.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  isActive ? "bg-brand-mint" : "text-text-secondary hover:text-text-primary",
                )
              }
              style={({ isActive }) => (isActive ? theme.text : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden lg:block" />
          {isManager && tenant && (
            <Link
              to={`/espace/${tenant.slug}/gestion`}
              className="hidden items-center gap-1.5 rounded-xl border border-border-soft px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
            >
              <Settings className="h-4 w-4" /> Gérer
            </Link>
          )}
          <TenantCtaLink
            cta={cta}
            style={theme.button}
            className="hidden items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:inline-flex"
          />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl text-text-secondary hover:bg-brand-mint hover:text-text-primary lg:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border-soft bg-white lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-3">
            {TENANT_NAV.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-xl px-3 py-2.5 text-sm font-semibold",
                    isActive ? "bg-brand-mint" : "text-text-secondary",
                  )
                }
                style={({ isActive }) => (isActive ? theme.text : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
            <TenantCtaLink
              cta={cta}
              onClick={() => setOpen(false)}
              style={theme.button}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            />
            {isManager && tenant && (
              <Link
                to={`/espace/${tenant.slug}/gestion`}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border-soft px-3 py-2.5 text-sm font-semibold text-text-secondary"
              >
                <Settings className="h-4 w-4" /> Gérer mon espace
              </Link>
            )}
            <a
              href={getSiteUrl() || "/"}
              className="mt-1 inline-flex items-center gap-1 px-3 py-2 text-xs text-text-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Propulsé par Wergu Yaram
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

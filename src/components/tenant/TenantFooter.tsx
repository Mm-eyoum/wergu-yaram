import { Link, NavLink } from "react-router-dom";
import { ArrowUpRight, Globe } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { initials } from "@/lib/format";
import { accentTheme } from "@/lib/tenantTheme";
import { getSiteUrl } from "@/seo/siteUrl";
import { TENANT_NAV } from "./tenantNav";

/**
 * White-label footer for a partner micro-site: partner identity + space nav +
 * a discreet "powered by Wergu Yaram" attribution linking back to the portal.
 */
export function TenantFooter() {
  const { tenant } = useTenant();
  const portal = getSiteUrl() || "https://werguyaram.org";
  const name = tenant?.name ?? "Espace partenaire";
  const theme = accentTheme(tenant?.theme?.accent);

  return (
    <footer className="mt-16 border-t border-border-soft bg-white">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Identity */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-soft ring-1 ring-border-soft"
              style={{ color: theme.solid }}
            >
              {tenant?.logo ? (
                <img src={tenant.logo} alt={name} className="max-h-7 max-w-[30px] object-contain" />
              ) : (
                <span className="text-sm font-extrabold">{initials(name)}</span>
              )}
            </span>
            <span className="text-base font-extrabold text-text-primary">{name}</span>
          </div>
          {tenant?.description && (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">{tenant.description}</p>
          )}
          {tenant?.website && (
            <a
              href={tenant.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"
              style={theme.text}
            >
              <Globe className="h-4 w-4" /> Site officiel
            </a>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Explorer</p>
          {TENANT_NAV.map((item) => (
            <NavLink key={item.key} to={item.to} end className="text-sm text-text-secondary hover:text-text-primary">
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Powered by */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Plateforme</p>
          <a href={portal} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:underline">
            Propulsé par Wergu Yaram <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <a href={`${portal}/conditions`} className="text-sm text-text-secondary hover:text-text-primary">
            Conditions &amp; mentions
          </a>
        </div>
      </div>

      <div className="border-t border-border-soft">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-text-secondary sm:flex-row">
          <p>© {new Date().getFullYear()} {name}. Tous droits réservés.</p>
          <Link to="/" className="hover:text-text-primary">
            {name} · Espace partenaire
          </Link>
        </div>
      </div>
    </footer>
  );
}

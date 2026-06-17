import { Link, NavLink } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { PRIMARY_NAV } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface AuthLayoutProps {
  /** Left reassurance panel content. */
  aside: React.ReactNode;
  children: React.ReactNode;
}

/** Split layout used by Login & Register (reassurance panel | form). */
export function AuthLayout({ aside, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-page">
      <header className="border-b border-border-soft">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-brand-green" : "text-text-secondary hover:text-text-primary",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/connexion" className="hidden text-sm font-medium link-muted sm:inline">
              Se connecter
            </Link>
            <Link
              to="/inscription"
              className="hidden rounded-xl bg-brand-green px-3.5 py-2 text-sm font-semibold text-white sm:inline"
            >
              Créer un compte
            </Link>
            <Link to="/" className="text-sm font-medium link-muted sm:hidden">
              Portail
            </Link>
          </div>
        </div>
      </header>

      <div className="container-page grid items-stretch gap-8 pb-16 pt-4 lg:grid-cols-2">
        {/* Reassurance panel */}
        <section className="relative hidden overflow-hidden rounded-3xl bg-mint-fade p-10 lg:flex lg:flex-col">
          {aside}
          <div className="mt-auto flex items-center gap-2 rounded-2xl border border-border-soft bg-white/70 p-3 text-xs text-text-secondary">
            <ShieldCheck className="h-4 w-4 text-brand-green" />
            Vos données de santé sont protégées et confidentielles.
          </div>
        </section>

        {/* Form */}
        <section className="flex items-center">
          <div className="w-full">{children}</div>
        </section>
      </div>
    </div>
  );
}

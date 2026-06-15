import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, MessageCircle, User, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { MAIN_NAV } from "@/lib/constants";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { UniversalSearchBar } from "@/components/search/UniversalSearchBar";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Logo />

        {/* Compact persistent search on inner pages */}
        {!isHome && (
          <div className="hidden flex-1 lg:block">
            <UniversalSearchBar size="compact" />
          </div>
        )}

        <nav className={cn("hidden items-center gap-1 lg:flex", !isHome && "xl:gap-1")}>
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  isActive && item.to !== "/"
                    ? "text-brand-green"
                    : "text-text-secondary hover:text-brand-green",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          {user ? (
            <div className="relative hidden lg:block">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-border-soft bg-white py-1 pl-1 pr-3 hover:border-brand-teal"
              >
                <Avatar name={user.displayName ?? "Utilisateur"} src={user.photoURL} size="sm" />
                <span className="max-w-[120px] truncate text-sm font-medium text-text-primary">
                  {user.displayName?.split(" ")[0] ?? "Mon compte"}
                </span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-border-soft bg-white py-1.5 shadow-card animate-fade-in"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <MenuItem to="/dashboard" icon={<User className="h-4 w-4" />} label="Mon tableau de bord" />
                  <MenuItem to="/messages" icon={<MessageCircle className="h-4 w-4" />} label="Messages" />
                  <button
                    onClick={async () => {
                      await logout();
                      navigate("/");
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger hover:bg-brand-soft"
                  >
                    <LogOut className="h-4 w-4" />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <ButtonLink to="/connexion" variant="outline" size="sm">
                Se connecter
              </ButtonLink>
              <ButtonLink to="/inscription" size="sm">
                Créer un compte
              </ButtonLink>
            </div>
          )}

          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-border-soft text-text-primary lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Ouvrir le menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-border-soft bg-white lg:hidden">
          <div className="container-page space-y-3 py-4">
            <UniversalSearchBar size="compact" />
            <nav className="grid gap-1">
              {MAIN_NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-brand-mint"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-2 pt-1">
              {user ? (
                <>
                  <ButtonLink to="/dashboard" variant="outline" fullWidth>
                    Mon tableau de bord
                  </ButtonLink>
                  <ButtonLink to="/messages" variant="ghost" fullWidth>
                    Messages
                  </ButtonLink>
                </>
              ) : (
                <>
                  <ButtonLink to="/connexion" variant="outline" fullWidth>
                    Se connecter
                  </ButtonLink>
                  <ButtonLink to="/inscription" fullWidth>
                    Créer un compte
                  </ButtonLink>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-brand-soft"
    >
      <span className="text-text-secondary">{icon}</span>
      {label}
    </Link>
  );
}

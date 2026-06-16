import { Fragment, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, MessageCircle, ShieldCheck, User, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV } from "@/lib/constants";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { UniversalSearchBar } from "@/components/search/UniversalSearchBar";
import { ExploreAccordion, ExploreMenu } from "@/components/layout/ExploreMenu";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";

  // Subtle elevation once the page scrolls away from the top.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the user dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Lock body scroll + close on Escape while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  // Close both menus on navigation.
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-brand-mint text-brand-green"
        : "text-text-secondary hover:bg-brand-soft hover:text-brand-green",
    );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border-soft bg-white/80 backdrop-blur-md transition-shadow",
        scrolled && "shadow-soft",
      )}
    >
      <div className="container-page flex h-16 items-center gap-3">
        <Logo className="shrink-0" />

        {/* Compact persistent search on inner pages */}
        {!isHome && (
          <div className="hidden min-w-[220px] flex-1 xl:block">
            <UniversalSearchBar size="compact" />
          </div>
        )}

        {/* Desktop nav: Portail Santé · Explorer ▾ · (destinations) */}
        <nav className="hidden items-center gap-0.5 xl:flex">
          {PRIMARY_NAV.map((item, i) => (
            <Fragment key={item.to}>
              <NavLink to={item.to} end={item.to === "/"} className={navLinkClass}>
                {item.label}
              </NavLink>
              {i === 0 && <ExploreMenu />}
            </Fragment>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <div ref={userMenuRef} className="relative hidden xl:block">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                className={cn(
                  "flex items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-2.5 transition-colors",
                  menuOpen
                    ? "border-brand-teal bg-brand-soft"
                    : "border-border-soft hover:border-brand-teal hover:bg-brand-soft",
                )}
              >
                <Avatar name={user.displayName ?? "Utilisateur"} src={user.photoURL} size="sm" />
                <span className="max-w-[110px] truncate text-sm font-medium text-text-primary">
                  {user.displayName?.split(" ")[0] ?? "Mon compte"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-text-secondary transition-transform",
                    menuOpen && "rotate-180",
                  )}
                />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-border-soft bg-white py-1.5 shadow-card animate-fade-in"
                >
                  <MenuItem to="/dashboard" icon={<User className="h-4 w-4" />} label="Mon tableau de bord" />
                  <MenuItem to="/messages" icon={<MessageCircle className="h-4 w-4" />} label="Messages" />
                  {isAdmin && (
                    <MenuItem to="/admin" icon={<ShieldCheck className="h-4 w-4" />} label="Administration" />
                  )}
                  <div className="my-1.5 border-t border-border-soft" />
                  <button
                    onClick={async () => {
                      await logout();
                      navigate("/");
                    }}
                    className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 xl:flex">
              <ButtonLink to="/connexion" variant="outline" size="sm">
                Se connecter
              </ButtonLink>
              <ButtonLink to="/inscription" size="sm">
                Créer un compte
              </ButtonLink>
            </div>
          )}

          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-border-soft text-text-primary transition-colors hover:bg-brand-soft xl:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 top-16 z-30 cursor-default bg-brand-navy/20 backdrop-blur-sm animate-fade xl:hidden"
          />
          <div className="relative z-30 border-t border-border-soft bg-white shadow-card animate-slide-down xl:hidden">
            <div className="container-page max-h-[calc(100vh-4rem)] space-y-4 overflow-y-auto py-4 scroll-thin">
              <UniversalSearchBar size="compact" />
              <nav className="grid gap-1">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] items-center rounded-xl px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-brand-mint"
                >
                  Portail Santé
                </Link>
                <ExploreAccordion onNavigate={() => setMobileOpen(false)} />
                {PRIMARY_NAV.slice(1).map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-[44px] items-center rounded-xl px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-brand-mint"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-2 border-t border-border-soft pt-4">
                {user ? (
                  <>
                    <ButtonLink to="/dashboard" variant="outline" fullWidth>
                      Mon tableau de bord
                    </ButtonLink>
                    <ButtonLink to="/messages" variant="ghost" fullWidth>
                      Messages
                    </ButtonLink>
                    {isAdmin && (
                      <ButtonLink to="/admin" variant="ghost" fullWidth>
                        Administration
                      </ButtonLink>
                    )}
                    <button
                      onClick={async () => {
                        setMobileOpen(false);
                        await logout();
                        navigate("/");
                      }}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-danger hover:bg-danger/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Se déconnecter
                    </button>
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
        </>
      )}
    </header>
  );
}

function MenuItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="mx-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-text-primary transition-colors hover:bg-brand-soft"
    >
      <span className="text-text-secondary">{icon}</span>
      {label}
    </Link>
  );
}

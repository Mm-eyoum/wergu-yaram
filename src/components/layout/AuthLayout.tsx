import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

interface AuthLayoutProps {
  /** Left reassurance panel content. */
  aside: React.ReactNode;
  children: React.ReactNode;
}

/** Split layout used by Login & Register (reassurance panel | form). */
export function AuthLayout({ aside, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-page">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link to="/" className="text-sm font-medium link-muted">
          Retour au portail
        </Link>
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

import { TenantHeader } from "./TenantHeader";
import { TenantFooter } from "./TenantFooter";
import { SupportLauncher } from "@/components/support/SupportLauncher";

/**
 * Page shell for a partner micro-site (sub-domain): partner-branded header and
 * footer in place of the Wergu Yaram portal chrome. Mirrors AppShell so the rest
 * of the app (skip link, support launcher) behaves identically.
 */
export function TenantShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <a
        href="#main"
        className="sr-only z-[70] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>
      <TenantHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <TenantFooter />
      <SupportLauncher />
    </div>
  );
}

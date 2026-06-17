import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";
import { AnnouncementBanner } from "./AnnouncementBanner";

/** Standard page shell: header + main content + footer. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <a
        href="#main"
        className="sr-only z-[70] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>
      <AnnouncementBanner />
      <AppHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}

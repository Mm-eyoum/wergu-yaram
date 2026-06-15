import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";

/** Standard page shell: header + main content + footer. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <AppHeader />
      <main className="flex-1">{children}</main>
      <AppFooter />
    </div>
  );
}

/**
 * Résolution du tenant courant (espace partenaire multi-tenant).
 *
 * Ordre : `?tenant=<slug>` (test local) → `VITE_TENANT` (build preview) →
 * sous-domaine de l'hôte (`assad.werguyaram.org` → "assad"). Les hôtes de base
 * (portail principal) renvoient `null`.
 */
const BASE_HOSTS = new Set([
  "werguyaram.org",
  "www.werguyaram.org",
  "werguyaram.web.app",
  "werguyaram.firebaseapp.com",
  "localhost",
  "127.0.0.1",
]);
const RESERVED_SUBS = new Set(["www", "app", "admin", "api", "chat"]);

export function resolveTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("tenant");
  if (q) return q.toLowerCase();
  const env = import.meta.env.VITE_TENANT as string | undefined;
  if (env) return env.toLowerCase();

  const host = window.location.hostname;
  if (BASE_HOSTS.has(host)) return null;
  const parts = host.split(".");
  // <sub>.werguyaram.org (≥ 3 segments) — first label is the tenant slug.
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    if (sub && !RESERVED_SUBS.has(sub)) return sub;
  }
  return null;
}

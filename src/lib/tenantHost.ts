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
/**
 * Sous-domaines de service réservés — jamais utilisables comme slug de tenant.
 * Source unique côté app (le Worker Cloudflare en garde un doublon défensif).
 */
export const RESERVED_SUBS = new Set(["www", "app", "admin", "api", "chat"]);

/** Format DNS-label valide pour un slug de sous-domaine. */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Valide un slug de tenant destiné à devenir `<slug>.werguyaram.org`. Strict sur
 * la chaîne EXACTE (pas de normalisation) car elle sert d'id de document : ce qui
 * est validé est exactement ce qui sera enregistré. Renvoie un message d'erreur
 * (FR) si invalide, sinon `null`.
 */
export function tenantSlugError(slug: string): string | null {
  if (slug.length < 3 || slug.length > 63) return "Le sous-domaine doit faire entre 3 et 63 caractères.";
  if (!SLUG_RE.test(slug)) return "Le sous-domaine ne peut contenir que des lettres minuscules, chiffres et tirets (pas d'espace, ni en début/fin).";
  if (RESERVED_SUBS.has(slug)) return `« ${slug} » est un sous-domaine réservé.`;
  return null;
}

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

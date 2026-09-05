/**
 * Internal page-view logging for partner spaces — our own analytics, independent
 * of GA4. Fire-and-forget: writes a minimal, NO-PII record to `pageViews`
 * (tenantSlug + path + day). A scheduled Cloud Function rolls these into
 * `tenantReports`; raw views are never read by clients.
 */
import { addDoc, collection, serverTimestamp } from "@/services/db";
import { db } from "@/services/firebase";
import { usesD1 } from "@/services/dbRouting";

/** Records one view of a tenant page. Silently no-ops on any error. */
export function logTenantPageview(tenantSlug: string | undefined, path: string): void {
  if (!tenantSlug) return;

  // Côté D1 : une ligne par (tenant, jour, chemin), incrémentée à l'écriture.
  // La collection `pageViews` stockait UN document par vue, qu'un cron devait
  // vidanger chaque nuit ; ce contournement des limites de lot Firestore n'a
  // plus lieu d'être. `sendBeacon` survit à la navigation, contrairement à fetch.
  if (usesD1("pageViews")) {
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
    const body = JSON.stringify({ tenantSlug, path: path.slice(0, 300) });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${base}/api/v1/forms/pageview`, new Blob([body], { type: "application/json" }));
      } else {
        void fetch(`${base}/api/v1/forms/pageview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* l'analytique ne doit jamais casser la page */
    }
    return;
  }

  if (!db) return;
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  void addDoc(collection(db, "pageViews"), {
    tenantSlug,
    path: path.slice(0, 300),
    day,
    ts: serverTimestamp(),
  }).catch(() => {
    /* analytics must never break the page */
  });
}

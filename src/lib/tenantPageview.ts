/**
 * Internal page-view logging for partner spaces — our own analytics, independent
 * of GA4. Fire-and-forget: writes a minimal, NO-PII record to `pageViews`
 * (tenantSlug + path + day). A scheduled Cloud Function rolls these into
 * `tenantReports`; raw views are never read by clients.
 */
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";

/** Records one view of a tenant page. Silently no-ops on any error. */
export function logTenantPageview(tenantSlug: string | undefined, path: string): void {
  if (!db || !tenantSlug) return;
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

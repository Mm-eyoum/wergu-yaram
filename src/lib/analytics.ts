/**
 * Analytics funnel — émission d'events GA4 personnalisés (no-op-safe).
 *
 * Réutilise l'instance Firebase Analytics (même pattern que src/main.tsx, qui
 * route déjà les erreurs en `exception`). Tout échec est silencieux : Analytics
 * peut être bloqué, non supporté (SSR/prerender), ou Firebase non configuré.
 *
 * Usage : `track("donation_succeeded", { needId, amount })`.
 */
import { app, isFirebaseConfigured } from "@/services/firebase";
import { captureEvent } from "./posthog";

type Params = Record<string, string | number | boolean | undefined>;

/** Resolved once: the GA4 logEvent bound to the shared analytics instance. */
let logger: ((name: string, params?: Params) => void) | null = null;
let initStarted = false;

function ensureLogger(): void {
  if (initStarted || !isFirebaseConfigured || !app) return;
  initStarted = true;
  void import("firebase/analytics")
    .then(async ({ getAnalytics, isSupported, logEvent }) => {
      if (!(await isSupported())) return;
      const analytics = getAnalytics(app);
      logger = (name, params) => logEvent(analytics, name, params);
    })
    .catch(() => {
      /* Analytics unavailable — stay a no-op. */
    });
}

/**
 * Emit a custom analytics event. Safe to call anywhere; drops silently when
 * analytics isn't ready yet (early events before init resolves are best-effort).
 */
export function track(name: string, params?: Params): void {
  ensureLogger();
  try {
    logger?.(name, params);
  } catch {
    /* never throw from instrumentation */
  }
  // Miroir vers PostHog (no-op si non configuré) — complète GA4.
  captureEvent(name, params);
}

/**
 * Sentry — suivi d'erreurs (tier gratuit), no-op si VITE_SENTRY_DSN absent.
 *
 * Le SDK est chargé en import dynamique : il ne pèse sur le bundle QUE si un DSN
 * est configuré. Sentry s'ajoute au reporting existant — `main.tsx` enregistre un
 * sink composite (Sentry + GA4 `exception`) et tout `reportError()` y route déjà.
 */
import type { ErrorContext } from "./errorReporting";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/** True quand un DSN Sentry est configuré. */
export const isSentryEnabled = Boolean(dsn);

let sentry: typeof import("@sentry/react") | null = null;

/** Initialise Sentry (chargement dynamique). No-op si DSN absent ou hors navigateur. */
export async function initSentry(): Promise<void> {
  if (!isSentryEnabled || typeof window === "undefined") return;
  sentry = await import("@sentry/react");
  sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Traces légères : suffisant pour le tier gratuit, ajustable plus tard.
    tracesSampleRate: 0.1,
    // Ne pas envoyer de PII par défaut.
    sendDefaultPii: false,
  });
}

/** Remonte une erreur gérée à Sentry avec son contexte. No-op tant que non chargé. */
export function captureException(error: unknown, context: ErrorContext = {}): void {
  if (!sentry) return;
  sentry.captureException(error, { extra: { ...context } });
}

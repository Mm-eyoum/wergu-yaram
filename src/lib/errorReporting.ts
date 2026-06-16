/**
 * Central error reporting.
 *
 * Today this logs to the console with structured context. It is the single
 * choke point for client-side error reporting, so wiring a real backend
 * (Sentry, Firebase Crashlytics, a logging endpoint) later means changing only
 * `report()` here — every call site already routes through it.
 *
 * Two reasons this exists:
 *  1. Stop swallowing errors silently. Several services degrade to mock data on
 *     failure (catalog, search); without a report, a misconfigured Firestore
 *     looks identical to "no data yet".
 *  2. Catch otherwise-invisible failures: uncaught errors and unhandled promise
 *     rejections (see {@link installGlobalErrorHandlers}).
 */

export interface ErrorContext {
  /** Where the error happened, e.g. "catalog.listOrMock". */
  scope?: string;
  [key: string]: unknown;
}

/** Hook point for a real reporter. Defaults to a no-op beyond console logging. */
let sink: ((error: unknown, context: ErrorContext) => void) | null = null;

/** Register a backend reporter (e.g. Sentry.captureException). Optional. */
export function setErrorSink(fn: (error: unknown, context: ErrorContext) => void): void {
  sink = fn;
}

/** Report a handled error with context. Never throws. */
export function reportError(error: unknown, context: ErrorContext = {}): void {
  // eslint-disable-next-line no-console
  console.error(`[${context.scope ?? "app"}]`, error, context);
  try {
    sink?.(error, context);
  } catch {
    // A failing reporter must never break the app.
  }
}

let installed = false;

/**
 * Install window-level handlers for uncaught errors and unhandled promise
 * rejections. Idempotent. Call once at startup (see main.tsx).
 */
export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { scope: "unhandledrejection" });
  });
  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, { scope: "window.onerror" });
  });
}

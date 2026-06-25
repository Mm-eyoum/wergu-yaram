import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { TenantProvider } from "./context/TenantContext";
import { ToastProvider } from "./context/ToastContext";
import { queryClient } from "./lib/queryClient";
import { installGlobalErrorHandlers, setErrorSink } from "./lib/errorReporting";
import type { ErrorContext } from "./lib/errorReporting";
import { app, isFirebaseConfigured } from "./services/firebase";
import { initSentry, captureException } from "./lib/sentry";
import { initPosthog } from "./lib/posthog";
import "./i18n";
import "./index.css";

// Initialise les SDK tiers (chargement dynamique, no-op si non configurés).
void initSentry();
void initPosthog();

// Surface uncaught errors and unhandled promise rejections (no-op-safe).
installGlobalErrorHandlers();

// Sink composite : route chaque erreur remontée vers Sentry ET vers Firebase
// Analytics (GA4) en event `exception`. Les deux sont no-op-safe individuellement.
// Le sink GA4 est résolu de façon asynchrone (import dynamique d'analytics) ;
// Sentry est synchrone. On combine pour ne pas écraser l'un avec l'autre.
let ga4Sink: ((error: unknown, context: ErrorContext) => void) | null = null;

setErrorSink((error, context) => {
  captureException(error, context);
  ga4Sink?.(error, context);
});

// Route reported errors to Firebase Analytics (GA4) as `exception` events so
// production failures are visible. Guarded: only when Firebase is configured and
// Analytics is supported (browser only).
if (isFirebaseConfigured && app) {
  void import("firebase/analytics")
    .then(async ({ getAnalytics, isSupported, logEvent }) => {
      if (!(await isSupported())) return;
      const analytics = getAnalytics(app);
      ga4Sink = (error, context) => {
        const message = error instanceof Error ? error.message : String(error);
        logEvent(analytics, "exception", {
          description: `[${context.scope ?? "app"}] ${message}`.slice(0, 256),
          fatal: false,
        });
      };
    })
    .catch(() => {
      // Analytics unavailable (blocked, unsupported) — console logging remains.
    });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <TenantProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </TenantProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);

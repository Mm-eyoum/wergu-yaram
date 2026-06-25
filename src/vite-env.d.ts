/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  // Search backend: "local" (in-browser Orama index, default) | "typesense" (fallback).
  readonly VITE_SEARCH_BACKEND?: string;
  // Directory import source: "osm" (Overpass, default) | "google" (Places, fallback).
  readonly VITE_DIRECTORY_SOURCE?: string;
  // PostHog product analytics (no-op when key absent).
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  // Sentry error tracking (no-op when DSN absent).
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

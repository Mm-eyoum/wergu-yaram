/**
 * Resolves the canonical site origin used to build absolute URLs for canonical
 * tags, Open Graph images and JSON-LD.
 *
 * Priority: VITE_SITE_URL (set per environment) → window.location.origin (dev).
 * The build-time scripts read the same VITE_SITE_URL via Vite's loadEnv so the
 * prerendered HTML and the client agree.
 */
import { SITE_NAME } from "./config";

const ENV_SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "");

/** Absolute origin, e.g. "https://werguyaram.web.app" (no trailing slash). */
export function getSiteUrl(): string {
  if (ENV_SITE_URL) return ENV_SITE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Turns a path or already-absolute URL into an absolute URL. */
export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = getSiteUrl();
  return `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Builds the full page title: "Page — Wergu Yaram" (home keeps the brand alone). */
export function formatTitle(title: string, withSuffix = true): string {
  if (!withSuffix || title === SITE_NAME) return title;
  return `${title} — ${SITE_NAME}`;
}

/**
 * Normalises an Unsplash (or generic) cover into a 1200×630 social crop.
 * Leaves non-Unsplash URLs untouched.
 */
export function ogCrop(url: string): string {
  if (!url) return url;
  if (/images\.unsplash\.com/i.test(url)) {
    const u = url.split("?")[0];
    return `${u}?auto=format&fit=crop&w=1200&h=630&q=80`;
  }
  return url;
}

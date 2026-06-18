/**
 * Shared build-script helper: loads TypeScript SEO modules (route manifest,
 * OG-image list) in Node using Vite's own module loader, so the `@` alias and
 * the mock-data imports resolve exactly as they do in the app — no duplicate
 * data, no separate transpile step.
 */
import { createServer, loadEnv } from "vite";
import { loadLiveContent } from "./loadLiveContent.mjs";

/** Reads VITE_SITE_URL from the .env files the same way the app does. */
export function getSiteUrl(mode = "production") {
  const env = loadEnv(mode, process.cwd(), "");
  return (env.VITE_SITE_URL || process.env.VITE_SITE_URL || "").replace(/\/$/, "");
}

/**
 * Loads the SEO route manifest. Prefers **live Firestore content** (so
 * CMS-created/edited pages are prerendered and listed in the sitemap) and falls
 * back to the bundled mock baseline when Firestore is unavailable — the manifest
 * shape is identical either way (see src/seo/routes.ts `buildSeoManifest`).
 */
export async function loadSeoRoutes() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const mod = await vite.ssrLoadModule("/src/seo/routes.ts");
    const live = await loadLiveContent();
    return live ? mod.buildSeoManifest(live) : mod;
  } finally {
    await vite.close();
  }
}

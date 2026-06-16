/**
 * Shared build-script helper: loads TypeScript SEO modules (route manifest,
 * OG-image list) in Node using Vite's own module loader, so the `@` alias and
 * the mock-data imports resolve exactly as they do in the app — no duplicate
 * data, no separate transpile step.
 */
import { createServer, loadEnv } from "vite";

/** Reads VITE_SITE_URL from the .env files the same way the app does. */
export function getSiteUrl(mode = "production") {
  const env = loadEnv(mode, process.cwd(), "");
  return (env.VITE_SITE_URL || process.env.VITE_SITE_URL || "").replace(/\/$/, "");
}

/** Loads src/seo/routes.ts and returns its exports. */
export async function loadSeoRoutes() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });
  try {
    return await vite.ssrLoadModule("/src/seo/routes.ts");
  } finally {
    await vite.close();
  }
}

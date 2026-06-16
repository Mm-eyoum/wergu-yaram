/**
 * Static prerenderer. Serves the production `dist/` with `vite preview`, visits
 * every public route with Playwright, waits for the real page content to mount
 * (the [data-prerender-ready] sentinel rendered by <SEOHead/>), and writes the
 * fully-baked HTML — title, meta, Open Graph, Twitter, JSON-LD — to disk so
 * social crawlers that don't run JS see a rich preview.
 *
 *   node scripts/prerender.mjs
 *
 * Output: dist/<route>/index.html (and dist/index.html for "/").
 */
import { preview } from "vite";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadSeoRoutes } from "./_loadData.mjs";

const { allRoutes } = await loadSeoRoutes();

function outFile(route) {
  if (route === "/") return "dist/index.html";
  const clean = route.replace(/^\//, "").replace(/\/$/, "");
  return `dist/${clean}/index.html`;
}

const server = await preview({ preview: { port: 4180, strictPort: false }, logLevel: "error" });
const base = server.resolvedUrls.local[0].replace(/\/$/, "");
console.log(`▶ preview server: ${base}`);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Skip assets and external calls (images, Firebase/Google) — irrelevant to <head> capture, and faster.
await page.route("**/*", (route) => {
  const url = route.request().url();
  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf)(\?|$)/i.test(url)) return route.abort();
  if (/(googleapis|gstatic|firebaseio|identitytoolkit|firebaseinstallations|google-analytics)\.com/i.test(url))
    return route.abort();
  return route.continue();
});

let ok = 0;
let warned = 0;
for (const route of allRoutes) {
  try {
    await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 20000 });
    // The sentinel is hidden — wait for it to be attached to the DOM, not visible.
    await page.waitForSelector("[data-prerender-ready]", { state: "attached", timeout: 15000 });
  } catch {
    warned++;
    console.warn(`⚠ ${route} — sentinel not found, capturing best-effort`);
  }
  const html = "<!doctype html>\n" + (await page.evaluate(() => document.documentElement.outerHTML));
  const file = outFile(route);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html, "utf8");
  ok++;
  console.log(`✓ ${route}  →  ${file}`);
}

await browser.close();
await new Promise((res) => server.httpServer.close(res));
console.log(`\n${ok} routes prerendues${warned ? ` (${warned} avertissement(s))` : ""}.`);
process.exit(0);

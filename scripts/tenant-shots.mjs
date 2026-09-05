import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5173";
const OUT = "/tmp/wy-tenant";
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ["01_landing", "/?tenant=assad"],
  ["02_apropos", "/a-propos?tenant=assad"],
  ["03_communautes", "/communautes?tenant=assad"],
  ["04_soutenir", "/soutenir?tenant=assad"],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (const [name, path] of PAGES) {
  await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`✓ ${name} ${path}`);
}

// Mobile landing
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/?tenant=assad", { waitUntil: "networkidle" }).catch(() => {});
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/00_landing_mobile.png`, fullPage: true });
console.log("✓ 00_landing_mobile");

await browser.close();
console.log(`\nshots → ${OUT}`);

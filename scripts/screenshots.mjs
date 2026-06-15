/**
 * Capture full-page screenshots of every public page for visual QA against the
 * Figma-like mockups. Run while `npm run dev` is up:
 *
 *   node scripts/screenshots.mjs [baseUrl]
 *
 * Output: screenshots/<name>.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5173";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ["01_home", "/"],
  ["02_recherche", "/recherche?q=diabete"],
  ["03_medicament", "/medicaments/paracetamol-500mg"],
  ["04_pathologie", "/pathologies/hypertension-arterielle"],
  ["05_etablissement", "/etablissements/chn-fann"],
  ["06_communaute", "/communautes/diabete"],
  ["07_besoins", "/besoins"],
  ["09_connexion", "/connexion"],
  ["10_inscription", "/inscription"],
  ["11_article", "/articles/diabete-type-2"],
  ["12_forum", "/forum"],
  ["14_evenement", "/evenements/atelier-diabete"],
  ["15_besoin_don", "/besoins/bloc-operatoire-fann"],
  ["16_partenaires", "/partenaires"],
  ["communautes_liste", "/communautes"],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1448, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (const [name, path] of PAGES) {
  await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`✓ ${name}  ${path}`);
}

// Mobile home for responsive check
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "networkidle" }).catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/00_home_mobile.png`, fullPage: true });
console.log("✓ 00_home_mobile  / (390px)");

await browser.close();
console.log("\nCaptures dans ./screenshots");

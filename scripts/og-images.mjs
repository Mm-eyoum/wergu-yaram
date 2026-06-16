/**
 * Generates branded 1200×630 Open Graph images at build time for content that
 * has no cover image (medications, pathologies, communities) plus a generic
 * default. Renders an HTML template with Playwright and screenshots it.
 *
 *   node scripts/og-images.mjs
 *
 * Output: dist/og/<type>-<slug>.png  and  dist/og/default.png
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { loadSeoRoutes } from "./_loadData.mjs";

const OUT = "dist/og";
mkdirSync(OUT, { recursive: true });

const BRAND_GREEN = "#00A878";
const LOGO_DATA_URI = (() => {
  try {
    const b64 = readFileSync("public/logo.png").toString("base64");
    return `data:image/png;base64,${b64}`;
  } catch {
    return "";
  }
})();

const TYPE_LABEL = {
  medicament: "Médicament",
  pathologie: "Pathologie",
  communaute: "Communauté",
};

const esc = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Builds the OG card HTML for one item (or the default when item is null). */
function cardHtml({ label = "", title, subtitle = "", verified = false }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px; height: 630px; display: flex; flex-direction: column;
      justify-content: space-between; padding: 72px 80px;
      font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #fff;
      background: linear-gradient(135deg, #00B894 0%, #00A878 55%, #0B7D5C 100%);
    }
    .top { display: flex; align-items: center; gap: 16px; }
    .top img { height: 56px; width: 56px; border-radius: 14px; background: #fff; padding: 6px; }
    .brand { font-size: 30px; font-weight: 800; letter-spacing: -0.5px; }
    .label {
      display: inline-block; align-self: flex-start; font-size: 24px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 2px; opacity: 0.92;
      background: rgba(255,255,255,0.16); padding: 8px 18px; border-radius: 999px;
    }
    .title { font-size: 64px; font-weight: 800; line-height: 1.1; letter-spacing: -1px;
      max-width: 1000px; }
    .subtitle { font-size: 30px; font-weight: 500; opacity: 0.9; margin-top: 8px; }
    .foot { display: flex; align-items: center; gap: 12px; font-size: 24px; }
    .badge { display: inline-flex; align-items: center; gap: 8px; font-weight: 700;
      background: rgba(255,255,255,0.18); padding: 8px 16px; border-radius: 999px; }
    .mid { display: flex; flex-direction: column; gap: 18px; }
  </style></head><body>
    <div class="top">
      ${LOGO_DATA_URI ? `<img src="${LOGO_DATA_URI}" alt="" />` : ""}
      <span class="brand">Wergu Yaram</span>
    </div>
    <div class="mid">
      ${label ? `<span class="label">${esc(label)}</span>` : ""}
      <div>
        <div class="title">${esc(title)}</div>
        ${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ""}
      </div>
    </div>
    <div class="foot">
      ${verified ? `<span class="badge">✔ Vérifié — Comité éditorial</span>` : `<span style="opacity:.85">Portail santé du Sénégal</span>`}
    </div>
  </body></html>`;
}

const { ogImageItems } = await loadSeoRoutes();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

async function shoot(html, file) {
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/${file}`, type: "png" });
}

// Default fallback image
await shoot(
  cardHtml({ title: "Portail santé du Sénégal", subtitle: "Médicaments · Pathologies · Établissements · Communautés" }),
  "default.png",
);
console.log("✓ default.png");

for (const item of ogImageItems) {
  await shoot(
    cardHtml({
      label: TYPE_LABEL[item.type],
      title: item.title,
      subtitle: item.subtitle,
      verified: item.verified,
    }),
    `${item.type}-${item.slug}.png`,
  );
  console.log(`✓ ${item.type}-${item.slug}.png`);
}

await browser.close();
console.log(`\n${ogImageItems.length + 1} images OG générées dans ${OUT}`);

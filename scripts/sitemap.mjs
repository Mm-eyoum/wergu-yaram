/**
 * Generates dist/sitemap.xml from the shared route manifest, including image
 * entries for content that has a cover. Run after `vite build`.
 *
 *   node scripts/sitemap.mjs
 */
import { writeFileSync } from "node:fs";
import { loadSeoRoutes, getSiteUrl } from "./_loadData.mjs";

const SITE_URL = getSiteUrl();
if (!SITE_URL) {
  console.warn("⚠ VITE_SITE_URL non défini — les URLs du sitemap seront relatives.");
}

const { sitemapEntries } = await loadSeoRoutes();

const esc = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const urls = sitemapEntries
  .map((e) => {
    const loc = `${SITE_URL}${e.path}`;
    const image = e.image
      ? `\n    <image:image><image:loc>${esc(e.image)}</image:loc>${
          e.imageTitle ? `<image:title>${esc(e.imageTitle)}</image:title>` : ""
        }</image:image>`
      : "";
    return `  <url>
    <loc>${esc(loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>${image}
  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;

writeFileSync("dist/sitemap.xml", xml, "utf8");
console.log(`✓ dist/sitemap.xml — ${sitemapEntries.length} URLs`);

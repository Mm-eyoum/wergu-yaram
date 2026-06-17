/**
 * Build-time route manifest — the single source of truth for which URLs get
 * prerendered, OG-imaged and listed in the sitemap.
 *
 * Imported ONLY by the build scripts (scripts/*.mjs) via Vite's ssrLoadModule,
 * never by the client bundle. Derives every dynamic route from the same mock
 * data the app renders, so the lists can never drift.
 */
import {
  pathologies,
  articles,
  facilities,
  communities,
  equipmentNeeds,
  events,
} from "@/services/content";
// Build-only: the synchronous medication list (full LME dataset). Imported
// directly from the mock module — the browser uses the lazy loader instead.
import { medications } from "@/data/mockMedications";
import { ogCrop } from "./siteUrl";

/** Rich sitemap entry. `image`/`lastmod` are filled when the source has them. */
export interface RouteEntry {
  path: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: number;
  lastmod?: string;
  image?: string;
  imageTitle?: string;
}

/** Public structural pages (no dynamic param). */
export const staticEntries: RouteEntry[] = [
  { path: "/", changefreq: "daily", priority: 1.0 },
  { path: "/carte", changefreq: "weekly", priority: 0.7 },
  { path: "/structures", changefreq: "weekly", priority: 0.7 },
  { path: "/communautes", changefreq: "weekly", priority: 0.7 },
  { path: "/forum", changefreq: "daily", priority: 0.7 },
  { path: "/besoins", changefreq: "daily", priority: 0.8 },
  { path: "/evenements", changefreq: "daily", priority: 0.7 },
  { path: "/partenaires", changefreq: "monthly", priority: 0.6 },
  { path: "/soutenir", changefreq: "monthly", priority: 0.6 },
];

export const dynamicEntries: RouteEntry[] = [
  ...medications.map((m) => ({
    path: `/medicaments/${m.slug}`,
    changefreq: "monthly" as const,
    priority: 0.8,
    lastmod: m.trust.updatedAt,
  })),
  ...pathologies.map((p) => ({
    path: `/pathologies/${p.slug}`,
    changefreq: "monthly" as const,
    priority: 0.8,
    lastmod: p.trust.updatedAt,
  })),
  ...articles.map((a) => ({
    path: `/articles/${a.slug}`,
    changefreq: "weekly" as const,
    priority: 0.8,
    lastmod: a.trust.updatedAt || a.publishedAt,
    image: ogCrop(a.cover),
    imageTitle: a.title,
  })),
  ...facilities.map((f) => ({
    path: `/etablissements/${f.slug}`,
    changefreq: "monthly" as const,
    priority: 0.7,
    image: ogCrop(f.cover),
    imageTitle: f.name,
  })),
  ...communities.map((c) => ({
    path: `/communautes/${c.slug}`,
    changefreq: "weekly" as const,
    priority: 0.6,
  })),
  ...equipmentNeeds.map((n) => ({
    path: `/besoins/${n.id}`,
    changefreq: "daily" as const,
    priority: 0.7,
    image: ogCrop(n.cover),
    imageTitle: n.title,
  })),
  ...events.map((e) => ({
    path: `/evenements/${e.id}`,
    changefreq: "weekly" as const,
    priority: 0.7,
    image: ogCrop(e.cover),
    imageTitle: e.title,
  })),
];

/** Routes prerendered but kept out of the sitemap (auth pages). */
export const auxRoutes: string[] = ["/connexion", "/inscription"];

export const sitemapEntries: RouteEntry[] = [...staticEntries, ...dynamicEntries];

/** Every route the prerenderer should visit. */
export const allRoutes: string[] = [
  ...staticEntries.map((e) => e.path),
  ...dynamicEntries.map((e) => e.path),
  ...auxRoutes,
];

/**
 * Imageless content that needs a templated OG image generated at build time.
 * Each becomes /og/<type>-<slug>.png.
 */
export interface OgImageItem {
  type: "medicament" | "pathologie" | "communaute";
  slug: string;
  title: string;
  subtitle: string;
  verified: boolean;
}

export const ogImageItems: OgImageItem[] = [
  ...medications.map((m) => ({
    type: "medicament" as const,
    slug: m.slug,
    title: `${m.name} ${m.dosage}`,
    subtitle: m.family,
    verified: m.trust.verified,
  })),
  ...pathologies.map((p) => ({
    type: "pathologie" as const,
    slug: p.slug,
    title: p.name,
    subtitle: p.category,
    verified: p.trust.verified,
  })),
  ...communities.map((c) => ({
    type: "communaute" as const,
    slug: c.slug,
    title: c.name,
    subtitle: c.topic,
    verified: false,
  })),
];

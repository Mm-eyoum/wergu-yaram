/**
 * Build-time route manifest — the single source of truth for which URLs get
 * prerendered, OG-imaged and listed in the sitemap.
 *
 * Imported ONLY by the build scripts (scripts/*.mjs) via Vite's ssrLoadModule,
 * never by the client bundle.
 *
 * The manifest is built by the pure `buildSeoManifest(content)` function. Build
 * scripts call it with **live Firestore content** (so CMS-created/edited pages
 * appear in the sitemap and prerender). When Firestore is unavailable they fall
 * back to the bundled mock content via the default exports below — the build
 * never breaks, it just regenerates the seeded baseline.
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
import type {
  Article,
  Community,
  EquipmentNeed,
  Facility,
  HealthEvent,
  Medication,
  Pathology,
} from "@/types/domain";

/** Rich sitemap entry. `image`/`lastmod` are filled when the source has them. */
export interface RouteEntry {
  path: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: number;
  lastmod?: string;
  image?: string;
  imageTitle?: string;
}

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

/** The catalog content a manifest is derived from (live Firestore or mock). */
export interface SeoContent {
  medications: Medication[];
  pathologies: Pathology[];
  articles: Article[];
  facilities: Facility[];
  communities: Community[];
  equipmentNeeds: EquipmentNeed[];
  events: HealthEvent[];
}

export interface SeoManifest {
  staticEntries: RouteEntry[];
  dynamicEntries: RouteEntry[];
  auxRoutes: string[];
  sitemapEntries: RouteEntry[];
  allRoutes: string[];
  ogImageItems: OgImageItem[];
}

/** Public structural pages (no dynamic param). */
const STATIC_ENTRIES: RouteEntry[] = [
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

/** Routes prerendered but kept out of the sitemap (auth pages). */
const AUX_ROUTES: string[] = ["/connexion", "/inscription"];

/** Pure builder: derive the full SEO manifest from a catalog content bundle. */
export function buildSeoManifest(content: SeoContent): SeoManifest {
  const staticEntries = STATIC_ENTRIES;

  const dynamicEntries: RouteEntry[] = [
    ...content.medications.map((m) => ({
      path: `/medicaments/${m.slug}`,
      changefreq: "monthly" as const,
      priority: 0.8,
      lastmod: m.trust.updatedAt,
    })),
    ...content.pathologies.map((p) => ({
      path: `/pathologies/${p.slug}`,
      changefreq: "monthly" as const,
      priority: 0.8,
      lastmod: p.trust.updatedAt,
    })),
    ...content.articles.map((a) => ({
      path: `/articles/${a.slug}`,
      changefreq: "weekly" as const,
      priority: 0.8,
      lastmod: a.trust.updatedAt || a.publishedAt,
      image: ogCrop(a.cover),
      imageTitle: a.title,
    })),
    ...content.facilities.map((f) => ({
      path: `/etablissements/${f.slug}`,
      changefreq: "monthly" as const,
      priority: 0.7,
      image: ogCrop(f.cover),
      imageTitle: f.name,
    })),
    ...content.communities.map((c) => ({
      path: `/communautes/${c.slug}`,
      changefreq: "weekly" as const,
      priority: 0.6,
    })),
    ...content.equipmentNeeds.map((n) => ({
      path: `/besoins/${n.id}`,
      changefreq: "daily" as const,
      priority: 0.7,
      image: ogCrop(n.cover),
      imageTitle: n.title,
    })),
    ...content.events.map((e) => ({
      path: `/evenements/${e.id}`,
      changefreq: "weekly" as const,
      priority: 0.7,
      image: ogCrop(e.cover),
      imageTitle: e.title,
    })),
  ];

  const ogImageItems: OgImageItem[] = [
    ...content.medications.map((m) => ({
      type: "medicament" as const,
      slug: m.slug,
      title: `${m.name} ${m.dosage}`,
      subtitle: m.family,
      verified: m.trust.verified,
    })),
    ...content.pathologies.map((p) => ({
      type: "pathologie" as const,
      slug: p.slug,
      title: p.name,
      subtitle: p.category,
      verified: p.trust.verified,
    })),
    ...content.communities.map((c) => ({
      type: "communaute" as const,
      slug: c.slug,
      title: c.name,
      subtitle: c.topic,
      verified: false,
    })),
  ];

  const sitemapEntries = [...staticEntries, ...dynamicEntries];
  const allRoutes = [
    ...staticEntries.map((e) => e.path),
    ...dynamicEntries.map((e) => e.path),
    ...AUX_ROUTES,
  ];

  return { staticEntries, dynamicEntries, auxRoutes: AUX_ROUTES, sitemapEntries, allRoutes, ogImageItems };
}

/** Bundled mock content — the fallback baseline when Firestore is unavailable. */
export const mockSeoContent: SeoContent = {
  medications,
  pathologies,
  articles,
  facilities,
  communities,
  equipmentNeeds,
  events,
};

// Back-compat default exports, derived from the bundled mock content. Build
// scripts prefer live Firestore via buildSeoManifest(); these are the fallback.
const mockManifest = buildSeoManifest(mockSeoContent);
export const staticEntries = mockManifest.staticEntries;
export const dynamicEntries = mockManifest.dynamicEntries;
export const auxRoutes = mockManifest.auxRoutes;
export const sitemapEntries = mockManifest.sitemapEntries;
export const allRoutes = mockManifest.allRoutes;
export const ogImageItems = mockManifest.ogImageItems;

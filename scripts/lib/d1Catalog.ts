/**
 * Lecture du catalogue depuis l'API D1, pour le pipeline de build.
 *
 * Interface volontairement IDENTIQUE à scripts/lib/firestoreCatalog.ts, pour que
 * les consommateurs (build-search-index, typesense-index, prerender) ne changent
 * que d'un import.
 *
 * ⚠️ POURQUOI C'EST IMPORTANT
 * Aujourd'hui le build lit Firestore par un chemin de code DIFFÉRENT de celui de
 * l'application (requêtes Admin SDK d'un côté, services client de l'autre). D'où
 * l'avertissement en gras de DEPLOYMENT.md : lancer `build:seo` sur une base non
 * peuplée fige du contenu FICTIF dans le HTML de production et dans le sitemap.
 * En lisant le MÊME endpoint que l'application, cette divergence devient
 * structurellement impossible.
 */
import type { SearchContent } from "@/services/content";

export interface OrgHit {
  id: string;
  title: string;
  description: string;
  href: string;
  verified: boolean;
}

const API_BASE = (process.env.VITE_API_BASE_URL ?? process.env.API_BASE_URL ?? "").replace(/\/$/, "");

/** Marqueur de disponibilité, pour rester symétrique de `getDb()`. */
export function getCatalogApi(): string | null {
  if (!API_BASE) {
    console.log("ℹ︎ VITE_API_BASE_URL absent → contenu mock indexé");
    return null;
  }
  return API_BASE;
}

interface ExportPayload {
  generatedAt: string;
  collections: Record<string, Record<string, unknown>[]>;
}

export async function fetchLiveCatalog(base: string | null): Promise<SearchContent | null> {
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/v1/export/catalog`);
    if (!res.ok) {
      console.log(`ℹ︎ API catalogue HTTP ${res.status} → contenu mock indexé`);
      return null;
    }
    const body = (await res.json()) as ExportPayload;
    const c = body.collections ?? {};
    const content = {
      medications: c.medications ?? [],
      pathologies: c.pathologies ?? [],
      articles: c.articles ?? [],
      facilities: c.facilities ?? [],
      communities: c.communities ?? [],
      events: c.events ?? [],
      equipmentNeeds: c.equipmentNeeds ?? [],
      partners: c.partners ?? [],
      formations: c.formations ?? [],
    } as unknown as SearchContent;

    const total = Object.values(content).reduce((n, list) => n + (list as unknown[]).length, 0);
    if (total === 0) {
      console.log("ℹ︎ catalogue D1 vide → contenu mock indexé");
      return null;
    }
    console.log(`✓ catalogue D1 chargé (${total} documents)`);
    return content;
  } catch (err) {
    console.log(`ℹ︎ API catalogue inaccessible (${(err as Error)?.message ?? err}) → contenu mock indexé`);
    return null;
  }
}

/**
 * Pages « organisation » indexables.
 *
 * La collection `organizations` est VIDE en production : la consolidation vers
 * `facilities` (déjà présentes dans le catalogue ci-dessus) est terminée. On
 * renvoie donc une liste vide plutôt que d'exposer un endpoint pour rien.
 * À rétablir si des pages partenaires redeviennent indexables.
 */
export async function fetchActiveOrgHits(_base: string | null): Promise<OrgHit[]> {
  return [];
}

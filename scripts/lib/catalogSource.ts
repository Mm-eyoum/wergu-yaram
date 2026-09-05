/**
 * Aiguillage de la source du catalogue pour le pipeline de build.
 *
 * Pendant la bascule progressive, les deux sources coexistent :
 *   - `d1`        (défaut si VITE_API_BASE_URL est défini) — l'API Workers ;
 *   - `firestore` (défaut sinon)                          — l'Admin SDK.
 *
 * Forçable via CATALOG_SOURCE=d1|firestore, ce qui permet de comparer les deux
 * index de recherche produits et de vérifier la parité avant de basculer le
 * déploiement.
 */
import * as firestoreSource from "./firestoreCatalog";
import * as d1Source from "./d1Catalog";
import type { SearchContent } from "@/services/content";
import type { OrgHit } from "./firestoreCatalog";

type Source = "d1" | "firestore";

export function resolveSource(): Source {
  const forced = process.env.CATALOG_SOURCE as Source | undefined;
  if (forced === "d1" || forced === "firestore") return forced;
  return process.env.VITE_API_BASE_URL || process.env.API_BASE_URL ? "d1" : "firestore";
}

/** Handle opaque de la source retenue (base D1 ou instance Firestore). */
export function getCatalogHandle(): unknown {
  const source = resolveSource();
  console.log(`ℹ︎ source du catalogue : ${source}`);
  return source === "d1" ? d1Source.getCatalogApi() : firestoreSource.getDb();
}

export async function fetchLiveCatalog(handle: unknown): Promise<SearchContent | null> {
  return resolveSource() === "d1"
    ? d1Source.fetchLiveCatalog(handle as string | null)
    : firestoreSource.fetchLiveCatalog(handle as Parameters<typeof firestoreSource.fetchLiveCatalog>[0]);
}

export async function fetchActiveOrgHits(handle: unknown): Promise<OrgHit[]> {
  return resolveSource() === "d1"
    ? d1Source.fetchActiveOrgHits(handle as string | null)
    : firestoreSource.fetchActiveOrgHits(handle as Parameters<typeof firestoreSource.fetchActiveOrgHits>[0]);
}

/**
 * Search service.
 *
 * Backend choisi par VITE_SEARCH_BACKEND :
 *  - "local" (défaut) : index Orama in-browser chargé depuis /search-index.json
 *    (gratuit, voir services/searchIndex). Aucun coût récurrent.
 *  - "typesense" : Typesense Cloud (clé SEARCH-ONLY exposée, sûre), conservé en
 *    fallback. Indexation serveur via scripts/typesense-index.ts.
 *
 * Dans les deux cas, si le backend est indisponible, on retombe sur l'index mock
 * bundlé (services/content.searchContent) en dev — jamais d'invention en prod.
 */
import type { Client as TypesenseClient } from "typesense";
import type { SearchHit } from "@/types/domain";
import { searchContent } from "./content";
import { getLocalHits } from "./searchIndex";
import { reportError } from "@/lib/errorReporting";

const searchBackend = (import.meta.env.VITE_SEARCH_BACKEND as string | undefined) ?? "local";
/** True quand l'index in-browser (Orama) est le backend actif. */
export const isLocalSearchBackend = searchBackend !== "typesense";

const host = import.meta.env.VITE_TYPESENSE_HOST as string | undefined;
// Typesense Cloud Search Delivery Network: route to the geographically nearest
// node, with the individual node host as fallback. Optional.
const nearestHost = import.meta.env.VITE_TYPESENSE_NEAREST_HOST as string | undefined;
const searchKey = import.meta.env.VITE_TYPESENSE_SEARCH_KEY as string | undefined;
const collection = (import.meta.env.VITE_TYPESENSE_COLLECTION as string | undefined) ?? "content";
const port = Number(import.meta.env.VITE_TYPESENSE_PORT ?? 443);
const protocol = (import.meta.env.VITE_TYPESENSE_PROTOCOL as string) ?? "https";

/** True when a Typesense search endpoint is configured. */
export const isTypesenseConfigured = Boolean(host && searchKey);

/**
 * Whether the bundled mock index may back search when Typesense is absent.
 * Allowed in dev / when explicitly opted in, but NEVER in a normal production
 * build — there, missing Typesense yields an empty result rather than serving
 * invented hits built from mock catalog data. Provision Typesense for prod.
 */
const ALLOW_MOCK_SEARCH = (() => {
  const flag = import.meta.env.VITE_ALLOW_MOCK_FALLBACK;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return import.meta.env.DEV;
})();

/** Local mock index when allowed, otherwise no results (prod without Typesense). */
const localSearch = (query: string): Promise<SearchHit[]> =>
  ALLOW_MOCK_SEARCH ? searchContent(query, "all") : Promise.resolve([]);

// The Typesense SDK is loaded lazily (dynamic import) so it stays out of the
// initial bundle — it's only fetched the first time a real search runs.
let clientPromise: Promise<TypesenseClient> | null = null;
function getClient(): Promise<TypesenseClient> | null {
  if (!isTypesenseConfigured) return null;
  if (!clientPromise) {
    clientPromise = import("typesense").then(
      (m) =>
        new m.default.Client({
          ...(nearestHost ? { nearestNode: { host: nearestHost, port, protocol } } : {}),
          nodes: [{ host: host!, port, protocol }],
          apiKey: searchKey!,
          connectionTimeoutSeconds: 5,
        }),
    );
  }
  return clientPromise;
}

/**
 * Return all hits for a query (scope/relevance filtering is then applied
 * client-side by the page, mirroring the previous mock behaviour).
 */
export async function searchAllHits(query: string): Promise<SearchHit[]> {
  // Backend in-browser (défaut) : index Orama statique, aucun coût récurrent.
  if (isLocalSearchBackend) {
    try {
      return await getLocalHits(query);
    } catch (err) {
      reportError(err, { scope: "search.getLocalHits" });
      return localSearch(query);
    }
  }
  // Backend Typesense (fallback, VITE_SEARCH_BACKEND=typesense).
  const clientP = getClient();
  if (!clientP) return localSearch(query);
  try {
    const client = await clientP;
    const q = query.trim() || "*";
    // Fetch ALL matching docs (paginated), not just the first page: the page
    // filters by type/facets client-side, so a single 100-doc page truncated
    // per-type browses (e.g. ~560 médicaments) to a handful. A real text query
    // returns few matches → the loop stops after one page (no overhead); a
    // browse (q="*") returns the full corpus. Dedupe guards page overlap.
    const PER_PAGE = 250; // Typesense max
    const MAX = 1000; // safety cap (≈ CATALOG_PAGE_SIZE)
    const out: SearchHit[] = [];
    const seen = new Set<string>();
    for (let page = 1; out.length < MAX; page++) {
      const res = await client
        .collections<SearchHit>(collection)
        .documents()
        .search({
          q,
          query_by: "title,keywords,description",
          per_page: PER_PAGE,
          page,
          sort_by: "_text_match:desc",
        });
      const hits = res.hits ?? [];
      for (const h of hits) {
        const doc = h.document as SearchHit & { id?: string };
        const key = doc.id ?? doc.href;
        if (key) {
          if (seen.has(key)) continue;
          seen.add(key);
        }
        out.push(h.document);
      }
      if (hits.length < PER_PAGE) break; // last page reached
    }
    return out;
  } catch (err) {
    // Network/permission/collection error → degrade to the local index,
    // but surface the cause instead of masking a Typesense misconfiguration.
    reportError(err, { scope: "search.searchAllHits" });
    return localSearch(query);
  }
}

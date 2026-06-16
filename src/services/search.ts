/**
 * Search service — Typesense when configured, mock federated index otherwise.
 *
 * The browser uses a **search-only** Typesense API key (safe to expose).
 * Indexing is done server-side with an admin key (see scripts/typesense-index.ts).
 * When Typesense env vars are absent, we transparently fall back to the bundled
 * client-side index (services/content.searchContent) so search keeps working
 * locally and before the Typesense server is provisioned.
 */
import type { Client as TypesenseClient } from "typesense";
import type { SearchHit } from "@/types/domain";
import { searchContent } from "./content";
import { reportError } from "@/lib/errorReporting";

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
  const clientP = getClient();
  if (!clientP) return searchContent(query, "all");
  try {
    const client = await clientP;
    const res = await client
      .collections<SearchHit>(collection)
      .documents()
      .search({
        q: query.trim() || "*",
        query_by: "title,keywords,description",
        per_page: 100,
        sort_by: "_text_match:desc",
      });
    return (res.hits ?? []).map((h) => h.document);
  } catch (err) {
    // Network/permission/collection error → degrade to the local index,
    // but surface the cause instead of masking a Typesense misconfiguration.
    reportError(err, { scope: "search.searchAllHits" });
    return searchContent(query, "all");
  }
}

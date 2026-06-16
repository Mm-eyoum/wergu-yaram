import { useQuery } from "@tanstack/react-query";
import { searchAllHits } from "@/services/search";

/**
 * Federated search hits for a query (Typesense or mock fallback).
 * Scope/filter/sort are applied client-side by the consuming page.
 *
 * `enabled` lets lightweight consumers (e.g. the header autocomplete) avoid
 * firing a query until the term is long enough.
 */
export function useSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => searchAllHits(query),
    enabled,
    // Keep prior hits while the next query resolves, and let empty query
    // return the full pool ("browse all").
    placeholderData: (prev) => prev,
  });
}

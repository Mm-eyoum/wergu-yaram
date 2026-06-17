/**
 * Content service — single façade over the data layer.
 *
 * Today it reads from local mock data (src/data). The function signatures are
 * intentionally simple so they can later be swapped for Firestore queries
 * without touching the UI components that call them.
 */
import type { ContentType, SearchHit } from "@/types/domain";
import { getSearchIndex } from "@/data/mockSearchIndex";

export { pathologies, pathologyBySlug } from "@/data/mockPathologies";
export { articles, articleBySlug } from "@/data/mockArticles";
export { facilities, facilityBySlug } from "@/data/mockFacilities";
export { communities, communityBySlug } from "@/data/mockCommunities";
export { equipmentNeeds, equipmentNeedById } from "@/data/mockEquipmentNeeds";
export { events, eventById } from "@/data/mockEvents";
export { partners, partnerBySlug } from "@/data/mockPartners";
export { forumThreads, FORUM_TOPICS, FORUM_CONTRIBUTORS } from "@/data/mockForum";
export { conversations } from "@/data/mockMessages";

export type SearchScope = ContentType | "all";

/** Federated search across all content types, ranked by simple relevance. */
export async function searchContent(query: string, scope: SearchScope = "all"): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  const index = await getSearchIndex();
  const pool = scope === "all" ? index : index.filter((h) => h.type === scope);
  if (!q) return pool;

  const terms = q.split(/\s+/).filter(Boolean);

  return pool
    .map((hit) => {
      let score = 0;
      const title = hit.title.toLowerCase();
      for (const term of terms) {
        if (title.includes(term)) score += 5;
        if (hit.keywords.includes(term)) score += 2;
      }
      if (title === q) score += 10;
      if (title.startsWith(q)) score += 4;
      return { hit, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.hit);
}

/** Counts per content type for the given query (drives result tabs). */
export async function searchCounts(query: string): Promise<Record<string, number>> {
  const all = await searchContent(query, "all");
  const counts: Record<string, number> = { all: all.length };
  for (const hit of all) counts[hit.type] = (counts[hit.type] ?? 0) + 1;
  return counts;
}

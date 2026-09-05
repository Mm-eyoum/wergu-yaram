import type { Community } from "@/types/domain";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Communautés suggérées selon les intérêts santé de l'utilisateur.
 *
 * Correspondance principale : intersection `relatedInterests` ∩ intérêts choisis
 * (au signup). Repli : le thème/nom de la communauté contient un intérêt.
 * Trie par nombre de correspondances décroissant. `exclude` = slugs déjà rejoints.
 */
export function suggestCommunities(
  communities: Community[],
  interests: string[] | undefined,
  exclude: Set<string> = new Set(),
  max = 4,
): Community[] {
  const wanted = new Set((interests ?? []).map(norm).filter(Boolean));
  if (wanted.size === 0) return [];
  return communities
    .filter((c) => !exclude.has(c.slug))
    .map((c) => {
      const tags = (c.relatedInterests ?? []).map(norm);
      let score = tags.filter((t) => wanted.has(t)).length;
      if (score === 0) {
        const hay = `${norm(c.topic)} ${norm(c.name)}`;
        if ([...wanted].some((w) => hay.includes(w))) score = 0.5;
      }
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.c);
}

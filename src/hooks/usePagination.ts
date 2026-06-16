import { useEffect, useState } from "react";

/**
 * Client-side "load more" pagination for an already-fetched list. Caps how many
 * items render at once (DOM/work bound) and exposes a `showMore` stepper.
 * Resets back to the first page whenever the source list size changes (new
 * filter, search term, or reload), so paging never strands the user on stale
 * results. Keyed on length (not array identity) so it stays correct even when
 * callers pass a freshly-built array each render.
 */
export function usePagination<T>(items: T[], pageSize = 12) {
  const [visible, setVisible] = useState(pageSize);

  useEffect(() => {
    setVisible(pageSize);
  }, [items.length, pageSize]);

  return {
    paged: items.slice(0, visible),
    hasMore: items.length > visible,
    remaining: Math.max(0, items.length - visible),
    showMore: () => setVisible((v) => v + pageSize),
  };
}

import { useEffect, useState } from "react";

/**
 * Client-side numbered pagination for an already-fetched list. Returns the
 * current page slice plus the page index and total page count for a `Pagination`
 * control. Resets back to the first page whenever the source list size changes
 * (new filter, search term, or reload), so paging never strands the user on a
 * page that no longer exists. Keyed on length (not array identity) so it stays
 * correct even when callers pass a freshly-built array each render.
 */
export function usePagination<T>(items: T[], pageSize = 12) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [items.length, pageSize]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;

  return {
    pageItems: items.slice(start, start + pageSize),
    page: current,
    pageCount,
    setPage,
  };
}

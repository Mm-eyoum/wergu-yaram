import { useInfiniteQuery } from "@tanstack/react-query";
import { listMedia, type MediaCategory } from "@/services/media";

export const mediaKeys = {
  all: ["media"] as const,
  list: (category?: MediaCategory, folder?: string) =>
    ["media", "list", category ?? "all", folder ?? "root"] as const,
};

/** Paginated media list (infinite scroll / "load more"). */
export function useMediaList(category?: MediaCategory, folder?: string) {
  return useInfiniteQuery({
    queryKey: mediaKeys.list(category, folder),
    queryFn: ({ pageParam }) => listMedia({ category, folder, cursor: pageParam }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

import { useQuery } from "@tanstack/react-query";
import { getPlatformStats } from "@/services/stats";

/**
 * Real, computed platform counts (members, facilities, partners, needs) for the
 * "trust" strips. Cached for a few minutes — these change slowly and the count
 * queries cost reads. Editable vanity figures come from `useSiteSettings().stats`.
 */
export const usePlatformStats = () =>
  useQuery({
    queryKey: ["platformStats"],
    queryFn: getPlatformStats,
    staleTime: 5 * 60 * 1000,
  });

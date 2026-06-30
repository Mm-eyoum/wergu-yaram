import { useMemo } from "react";
import type { Tenant } from "@/types/domain";
import {
  useArticles,
  useCommunities,
  useEvents,
  useTenantArticles,
  useTenantCommunities,
  useTenantEvents,
  useTenantEquipmentNeeds,
} from "./useCatalog";

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const k = key(it);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Aggregated public content for a partner space: items tagged to the tenant
 * (`tenantSlug`) merged with the admin-curated lists (`communitySlugs`,
 * `eventIds`, `articleSlugs`). Single source of truth so the landing, header
 * and support page resolve the same content — and thus the same adaptive CTA.
 */
export function useTenantSpace(slug?: string, tenant?: Tenant | null) {
  const { data: ownedCommunities = [] } = useTenantCommunities(slug);
  const { data: ownedEvents = [] } = useTenantEvents(slug);
  const { data: ownedArticles = [] } = useTenantArticles(slug);
  const { data: needs = [] } = useTenantEquipmentNeeds(slug);
  const { data: allCommunities = [] } = useCommunities();
  const { data: allEvents = [] } = useEvents();
  const { data: allArticles = [] } = useArticles();

  const communities = useMemo(
    () => dedupeBy([...ownedCommunities, ...allCommunities.filter((c) => tenant?.communitySlugs?.includes(c.slug))], (c) => c.slug),
    [ownedCommunities, allCommunities, tenant],
  );
  const events = useMemo(
    () => dedupeBy([...ownedEvents, ...allEvents.filter((e) => tenant?.eventIds?.includes(e.id))], (e) => e.id),
    [ownedEvents, allEvents, tenant],
  );
  const articles = useMemo(
    () => dedupeBy([...ownedArticles, ...allArticles.filter((a) => tenant?.articleSlugs?.includes(a.slug))], (a) => a.slug),
    [ownedArticles, allArticles, tenant],
  );

  return { communities, events, articles, needs };
}

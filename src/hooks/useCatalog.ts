/**
 * React Query hooks for the public catalog content.
 * Mirrors the pattern in useDashboardData (query keys + useQuery), so the UI
 * gets loading/error/empty states and caching for free, with a clean
 * migration path from mock → Firestore (see services/catalog.ts).
 */
import { useQuery } from "@tanstack/react-query";
import {
  getArticleBySlug,
  getArticles,
  getCommunities,
  getCommunityBySlug,
  getEquipmentNeedById,
  getEquipmentNeeds,
  getEventById,
  getEvents,
  getFacilities,
  getFacilityBySlug,
  getMedicationBySlug,
  getMedications,
  getPartnerBySlug,
  getPartners,
  getPathologies,
  getPathologyBySlug,
  getFormations,
  getFormationBySlug,
} from "@/services/catalog";

/** Query keys for catalog data — invalidate these after admin content edits. */
export const catalogKeys = {
  medications: ["catalog", "medications"] as const,
  medication: (slug: string) => ["catalog", "medication", slug] as const,
  pathologies: ["catalog", "pathologies"] as const,
  pathology: (slug: string) => ["catalog", "pathology", slug] as const,
  articles: ["catalog", "articles"] as const,
  article: (slug: string) => ["catalog", "article", slug] as const,
  facilities: ["catalog", "facilities"] as const,
  facility: (slug: string) => ["catalog", "facility", slug] as const,
  communities: ["catalog", "communities"] as const,
  community: (slug: string) => ["catalog", "community", slug] as const,
  equipmentNeeds: ["catalog", "equipmentNeeds"] as const,
  equipmentNeed: (id: string) => ["catalog", "equipmentNeed", id] as const,
  events: ["catalog", "events"] as const,
  event: (id: string) => ["catalog", "event", id] as const,
  partners: ["catalog", "partners"] as const,
  partner: (slug: string) => ["catalog", "partner", slug] as const,
  formations: ["catalog", "formations"] as const,
  formation: (slug: string) => ["catalog", "formation", slug] as const,
};

// --- Lists ---
export const useMedications = () =>
  useQuery({ queryKey: catalogKeys.medications, queryFn: getMedications });
export const usePathologies = () =>
  useQuery({ queryKey: catalogKeys.pathologies, queryFn: getPathologies });
export const useArticles = () =>
  useQuery({ queryKey: catalogKeys.articles, queryFn: getArticles });
export const useFacilities = () =>
  useQuery({ queryKey: catalogKeys.facilities, queryFn: getFacilities });
export const useCommunities = () =>
  useQuery({ queryKey: catalogKeys.communities, queryFn: getCommunities });
export const useEquipmentNeeds = () =>
  useQuery({ queryKey: catalogKeys.equipmentNeeds, queryFn: getEquipmentNeeds });
export const useEvents = () => useQuery({ queryKey: catalogKeys.events, queryFn: getEvents });
export const usePartners = () =>
  useQuery({ queryKey: catalogKeys.partners, queryFn: getPartners });
export const useFormations = () =>
  useQuery({ queryKey: catalogKeys.formations, queryFn: getFormations });

// --- Single items (enabled only when the route param is present) ---
export const useMedication = (slug: string | undefined) =>
  useQuery({
    queryKey: catalogKeys.medication(slug ?? ""),
    queryFn: () => getMedicationBySlug(slug),
    enabled: !!slug,
  });
export const usePathology = (slug: string | undefined) =>
  useQuery({
    queryKey: catalogKeys.pathology(slug ?? ""),
    queryFn: () => getPathologyBySlug(slug),
    enabled: !!slug,
  });
export const useArticle = (slug: string | undefined) =>
  useQuery({
    queryKey: catalogKeys.article(slug ?? ""),
    queryFn: () => getArticleBySlug(slug),
    enabled: !!slug,
  });
export const useFacility = (slug: string | undefined) =>
  useQuery({
    queryKey: catalogKeys.facility(slug ?? ""),
    queryFn: () => getFacilityBySlug(slug),
    enabled: !!slug,
  });
export const useCommunity = (slug: string | undefined) =>
  useQuery({
    queryKey: catalogKeys.community(slug ?? ""),
    queryFn: () => getCommunityBySlug(slug),
    enabled: !!slug,
  });
export const useEquipmentNeed = (id: string | undefined) =>
  useQuery({
    queryKey: catalogKeys.equipmentNeed(id ?? ""),
    queryFn: () => getEquipmentNeedById(id),
    enabled: !!id,
  });
export const useEvent = (id: string | undefined) =>
  useQuery({
    queryKey: catalogKeys.event(id ?? ""),
    queryFn: () => getEventById(id),
    enabled: !!id,
  });
export const usePartner = (slug: string | undefined) =>
  useQuery({
    queryKey: catalogKeys.partner(slug ?? ""),
    queryFn: () => getPartnerBySlug(slug),
    enabled: !!slug,
  });
export const useFormation = (slug: string | undefined) =>
  useQuery({
    queryKey: catalogKeys.formation(slug ?? ""),
    queryFn: () => getFormationBySlug(slug),
    enabled: !!slug,
  });

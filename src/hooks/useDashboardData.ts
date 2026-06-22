import { useQuery } from "@tanstack/react-query";
import {
  fetchFavorites,
  fetchMemberships,
  fetchReminders,
  fetchSavedSearches,
} from "@/services/userData";
import { fetchUserOrganizations } from "@/services/organizations";
import { fetchUserFacilities } from "@/services/facilities";
import { fetchUserSubscriptions, fetchUserDonations } from "@/services/billing";

/** Query keys for per-user dashboard data — invalidate these after mutations. */
export const dashboardKeys = {
  favorites: (uid: string) => ["favorites", uid] as const,
  savedSearches: (uid: string) => ["savedSearches", uid] as const,
  reminders: (uid: string) => ["reminders", uid] as const,
  memberships: (uid: string) => ["memberships", uid] as const,
  organizations: (uid: string) => ["organizations", uid] as const,
  facilities: (uid: string) => ["userFacilities", uid] as const,
  subscriptions: (uid: string) => ["userSubscriptions", uid] as const,
  donations: (uid: string) => ["userDonations", uid] as const,
};

export function useFavorites(uid: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.favorites(uid ?? ""),
    queryFn: () => fetchFavorites(uid!),
    enabled: !!uid,
  });
}

export function useSavedSearches(uid: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.savedSearches(uid ?? ""),
    queryFn: () => fetchSavedSearches(uid!),
    enabled: !!uid,
  });
}

export function useReminders(uid: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.reminders(uid ?? ""),
    queryFn: () => fetchReminders(uid!),
    enabled: !!uid,
  });
}

export function useMemberships(uid: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.memberships(uid ?? ""),
    queryFn: () => fetchMemberships(uid!),
    enabled: !!uid,
  });
}

export function useUserOrganizations(uid: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.organizations(uid ?? ""),
    queryFn: () => fetchUserOrganizations(uid!),
    enabled: !!uid,
  });
}

export function useUserFacilities(uid: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.facilities(uid ?? ""),
    queryFn: () => fetchUserFacilities(uid!),
    enabled: !!uid,
  });
}

export function useUserSubscriptions(uid: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.subscriptions(uid ?? ""),
    queryFn: () => fetchUserSubscriptions(uid!),
    enabled: !!uid,
  });
}

export function useUserDonations(uid: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.donations(uid ?? ""),
    queryFn: () => fetchUserDonations(uid!),
    enabled: !!uid,
  });
}

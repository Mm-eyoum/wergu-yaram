import { useQuery } from "@tanstack/react-query";
import { fetchAllUsers } from "@/services/users";
import { fetchPendingOrganizations } from "@/services/organizations";
import { fetchDirectoryFacilities } from "@/services/facilities";

export const adminKeys = {
  pendingOrgs: ["admin", "pendingOrgs"] as const,
  users: ["admin", "users"] as const,
  pendingClaims: ["admin", "pendingClaims"] as const,
  directoryFacilities: ["admin", "directoryFacilities"] as const,
  pendingVerifications: ["admin", "pendingVerifications"] as const,
};

export function usePendingOrganizations(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.pendingOrgs,
    queryFn: fetchPendingOrganizations,
    enabled,
  });
}

export function useDirectoryFacilities(enabled = true) {
  return useQuery({
    queryKey: adminKeys.directoryFacilities,
    queryFn: fetchDirectoryFacilities,
    enabled,
  });
}

export function useAllUsers(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: fetchAllUsers,
    enabled,
  });
}

import { useQuery } from "@tanstack/react-query";
import { fetchAllUsers } from "@/services/users";
import { fetchPendingOrganizations, fetchDirectoryOrganizations } from "@/services/organizations";

export const adminKeys = {
  pendingOrgs: ["admin", "pendingOrgs"] as const,
  users: ["admin", "users"] as const,
  pendingClaims: ["admin", "pendingClaims"] as const,
  directoryOrgs: ["admin", "directoryOrgs"] as const,
};

export function usePendingOrganizations(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.pendingOrgs,
    queryFn: fetchPendingOrganizations,
    enabled,
  });
}

export function useDirectoryOrganizations(enabled = true) {
  return useQuery({
    queryKey: adminKeys.directoryOrgs,
    queryFn: fetchDirectoryOrganizations,
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

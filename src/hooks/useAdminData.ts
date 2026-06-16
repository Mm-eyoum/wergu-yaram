import { useQuery } from "@tanstack/react-query";
import { fetchAllUsers } from "@/services/users";
import { fetchPendingOrganizations } from "@/services/organizations";

export const adminKeys = {
  pendingOrgs: ["admin", "pendingOrgs"] as const,
  users: ["admin", "users"] as const,
  pendingClaims: ["admin", "pendingClaims"] as const,
};

export function usePendingOrganizations(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.pendingOrgs,
    queryFn: fetchPendingOrganizations,
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

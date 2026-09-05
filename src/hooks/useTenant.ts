import { useContext } from "react";
import { TenantContext } from "@/context/tenant";

/** Current partner space (tenant), or `{ tenant: null }` on the main portal. */
export function useTenant() {
  return useContext(TenantContext);
}

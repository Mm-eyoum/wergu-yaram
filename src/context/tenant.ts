import { createContext } from "react";
import type { Tenant } from "@/types/domain";

export interface TenantContextValue {
  /** Espace partenaire actif (résolu par sous-domaine / param), ou null = portail. */
  tenant: Tenant | null;
  loading: boolean;
}

export const TenantContext = createContext<TenantContextValue>({ tenant: null, loading: false });

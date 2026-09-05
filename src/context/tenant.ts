import { createContext } from "react";
import type { Tenant } from "@/types/domain";

export interface TenantContextValue {
  /** Espace partenaire actif (résolu par sous-domaine / param), ou null = portail. */
  tenant: Tenant | null;
  loading: boolean;
  /**
   * Slug résolu depuis l'hôte (`<slug>.werguyaram.org`) ou `?tenant=`, **avant**
   * tout fetch. `null` sur le portail principal. Permet de distinguer « pas de
   * sous-domaine » de « sous-domaine présent mais tenant introuvable ».
   */
  slug: string | null;
}

export const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  loading: false,
  slug: null,
});

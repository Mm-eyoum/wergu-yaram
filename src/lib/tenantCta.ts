/**
 * Adaptive primary call-to-action for a partner space.
 *
 * The space's main action depends on what the partner actually offers, by
 * priority: an open equipment need (donate) → a community to join → their
 * official site → discover their actions. The same CTA drives the hero, the
 * header button and the closing action band, so the space has one clear goal.
 */
import type { Community, EquipmentNeed, Tenant } from "@/types/domain";

export type TenantCtaKind = "support" | "community" | "site" | "about";

export interface TenantCta {
  kind: TenantCtaKind;
  label: string;
  /** Internal route (within the space) — mutually exclusive with `href`. */
  to?: string;
  /** External URL (official website). */
  href?: string;
}

export function resolveTenantCta(opts: {
  needs: EquipmentNeed[];
  communities: Community[];
  tenant?: Tenant | null;
}): TenantCta {
  const { needs, communities, tenant } = opts;
  if (needs.length > 0) {
    return { kind: "support", label: "Soutenir", to: `/besoins/${needs[0].id}` };
  }
  if (communities.length > 0) {
    return { kind: "community", label: "Rejoindre la communauté", to: `/communautes/${communities[0].slug}` };
  }
  if (tenant?.website) {
    return { kind: "site", label: "Site officiel", href: tenant.website };
  }
  return { kind: "about", label: "Découvrir nos actions", to: "/a-propos" };
}

/**
 * Adapters: normalize `Organization` "pages" (user-created / imported directory
 * listings) into the shapes the public surfaces already render — so they can be
 * merged alongside curated catalog content. Every directory entry links to
 * `/structures/:id` and carries a badge to distinguish it from curated content.
 */
import type { Facility, Organization, Partner, SearchHit } from "@/types/domain";

/** "Annuaire" once claimed/managed, "Non réclamée" while still unowned. */
export function orgBadge(org: Organization): string {
  return org.claimStatus === "claimed" ? "Annuaire" : "Non réclamée";
}

export const orgHref = (org: Organization) => `/structures/${org.id}`;

/** A healthcare-facility org rendered through the existing FacilityCard. */
export function orgToFacilityCard(org: Organization): {
  facility: Facility;
  href: string;
  badge: string;
} {
  const facility: Facility = {
    slug: org.id,
    name: org.name,
    type: "Structure de santé",
    region: org.region ?? "",
    city: org.city ?? "",
    address: org.address ?? "",
    phone: org.phone ?? "",
    email: "",
    cover: "",
    description: org.description ?? "",
    specialties: [],
    services: [],
    capacity: "",
    hours: org.hours ?? "",
    rating: org.rating ?? 0,
    reviewsCount: 0,
    doctors: [],
    reviews: [],
    coords: org.coords ?? { lat: 0, lng: 0 },
    equipmentNeeds: [],
    verified: org.claimStatus === "claimed",
  };
  return { facility, href: orgHref(org), badge: orgBadge(org) };
}

const PARTNER_CATEGORY_LABEL: Record<string, string> = {
  partner: "Partenaire",
  partner_donor: "Donateur",
};

/** A partner / donor org rendered through the existing PartnerCard. */
export function orgToPartnerCard(org: Organization): {
  partner: Partner;
  href: string;
  badge: string;
} {
  const partner: Partner = {
    slug: org.id,
    name: org.name,
    category: "structure",
    categoryLabel: PARTNER_CATEGORY_LABEL[org.type] ?? "Partenaire",
    zone: org.region ?? org.city ?? "",
    logo: org.logo ?? "",
    description: org.description ?? "",
    contributionsLabel: "",
    tags: [],
  };
  return { partner, href: orgHref(org), badge: orgBadge(org) };
}

/** Any active org as a federated search hit (Établissements / Partenaires tabs). */
export function orgToSearchHit(org: Organization): SearchHit {
  const isFacility = org.type === "healthcare_facility";
  const place = [org.city, org.region].filter(Boolean).join(", ");
  return {
    id: `org:${org.id}`,
    type: isFacility ? "etablissement" : "partenaire",
    title: org.name,
    description: org.description || org.address || place,
    href: orgHref(org),
    meta: place,
    verified: org.claimStatus === "claimed",
    badge: orgBadge(org),
    keywords: [org.name, org.city, org.region, org.address].filter(Boolean).join(" "),
    facets: isFacility
      ? {
          facilityType: "Structure de santé",
          region: org.region,
          city: org.city,
          rating: org.rating,
        }
      : {
          partnerCategory: "structure",
          zone: org.region ?? org.city,
        },
  };
}

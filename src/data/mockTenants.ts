import type { Tenant } from "@/types/domain";

/**
 * Espaces partenaires de démonstration (fallback offline / Firestore vide).
 * Le « Kit Digital ASSAD » du deck 2026 est l'exemple de référence.
 */
export const tenants: Tenant[] = [
  {
    slug: "assad",
    published: true,
    name: "ASSAD",
    description:
      "Association Sénégalaise de Soutien et d'Assistance aux Diabétiques — informer, sensibiliser et accompagner, avec Wergu Yaram.",
    logo: null,
    theme: { accent: "#0B6FB8" },
    communitySlugs: ["diabete"],
    eventIds: [],
    articleSlugs: [],
    website: "",
  },
];

export function tenantBySlug(slug: string): Tenant | undefined {
  return tenants.find((t) => t.slug === slug);
}

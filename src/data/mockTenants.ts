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
    committee: {
      name: "Comité de pilotage Diabète (ASSAD)",
      mission:
        "Coordonner les actions de prévention et de dépistage du diabète, et valider les indicateurs d'impact.",
      members: [
        { name: "ASSAD", role: "Association", org: "ASSAD" },
        { name: "Comité scientifique", role: "Validation médicale", org: "Wergu Yaram" },
        { name: "Partenaire financier", role: "Bailleur" },
      ],
      indicators: [
        { label: "Personnes sensibilisées", value: "—" },
        { label: "Dépistages réalisés", value: "—" },
        { label: "Membres de la communauté", value: "—" },
      ],
    },
  },
];

export function tenantBySlug(slug: string): Tenant | undefined {
  return tenants.find((t) => t.slug === slug);
}

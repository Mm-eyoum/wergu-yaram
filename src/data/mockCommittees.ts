import type { Committee } from "@/types/domain";

/** Comités de démonstration (fallback offline / Firestore vide). */
export const committees: Committee[] = [
  {
    slug: "comite-diabete-assad",
    published: true,
    name: "Comité de pilotage Diabète (ASSAD)",
    mission:
      "Coordonner les actions de prévention et de dépistage du diabète, et valider les indicateurs d'impact.",
    tenantSlug: "assad",
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
];

export function committeeBySlug(slug: string): Committee | undefined {
  return committees.find((c) => c.slug === slug);
}

import type { Formation } from "@/types/domain";

/**
 * Données de démonstration pour les formations (fallback offline / Firestore vide).
 * Remplacées par le contenu Firestore une fois seedé (cf. scripts/seed.ts).
 */
export const formations: Formation[] = [
  {
    slug: "education-therapeutique-diabete",
    published: true,
    title: "Éducation thérapeutique du patient diabétique",
    excerpt:
      "Comprendre le diabète, l'autosurveillance glycémique, l'alimentation et l'observance pour accompagner les patients au quotidien.",
    category: "Diabète",
    level: "intermediaire",
    format: "e-learning",
    durationLabel: "4 modules · 3 h",
    audience: ["Soignants", "Aidants", "Agents de santé communautaire"],
    provider: { name: "Comité scientifique Wergu Yaram", role: "Formation" },
    modules: [
      { title: "Comprendre le diabète (types, complications)", durationLabel: "45 min" },
      { title: "Autosurveillance & traitements", durationLabel: "45 min" },
      { title: "Alimentation et activité physique", durationLabel: "45 min" },
      { title: "Communication & observance", durationLabel: "45 min" },
    ],
    objectives: [
      "Expliquer la maladie avec des mots simples",
      "Accompagner l'autosurveillance",
      "Repérer les signes d'alerte",
    ],
    certification: true,
    trust: { verified: true, source: "OMS / PNLMNT" },
  },
  {
    slug: "depistage-hypertension-communautaire",
    published: true,
    title: "Dépistage de l'hypertension en communauté",
    excerpt:
      "Organiser une journée de dépistage : mesure de la tension, orientation, sensibilisation et suivi.",
    category: "Hypertension",
    level: "debutant",
    format: "webinaire",
    durationLabel: "1 h 30",
    audience: ["Associations", "Leaders communautaires", "Bénévoles"],
    provider: { name: "Partenaire académique", role: "Santé publique" },
    modules: [
      { title: "Pourquoi dépister l'hypertension", durationLabel: "30 min" },
      { title: "Protocole de mesure & orientation", durationLabel: "30 min" },
      { title: "Sensibiliser et assurer le suivi", durationLabel: "30 min" },
    ],
    objectives: ["Mesurer correctement la tension", "Orienter vers une structure", "Sensibiliser le public"],
    certification: false,
    trust: { verified: true },
  },
];

export function formationBySlug(slug: string): Formation | undefined {
  return formations.find((f) => f.slug === slug);
}

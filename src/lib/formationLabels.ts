import type { FormationLevel, FormationFormat } from "@/types/domain";

export const FORMATION_LEVEL_LABELS: Record<FormationLevel, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export const FORMATION_FORMAT_LABELS: Record<FormationFormat, string> = {
  "e-learning": "E-learning",
  webinaire: "Webinaire",
  presentiel: "Présentiel",
  hybride: "Hybride",
};

import type { ContentType, Role } from "@/types/domain";

/** Primary navigation (matches mockup header). */
export const MAIN_NAV: { label: string; to: string }[] = [
  { label: "Portail Santé", to: "/" },
  { label: "Médicaments", to: "/recherche?type=medicament" },
  { label: "Pathologies", to: "/recherche?type=pathologie" },
  { label: "Établissements", to: "/recherche?type=etablissement" },
  { label: "Communautés", to: "/communautes" },
  { label: "Équipements", to: "/besoins" },
  { label: "Partenaires", to: "/partenaires" },
];

/** Search content types shown as chips / tabs. */
export const SEARCH_TYPES: { key: ContentType | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "pathologie", label: "Pathologies" },
  { key: "medicament", label: "Médicaments" },
  { key: "symptome", label: "Symptômes" },
  { key: "article", label: "Articles" },
  { key: "video", label: "Vidéos" },
  { key: "etablissement", label: "Établissements" },
  { key: "communaute", label: "Communautés" },
];

export const QUICK_SHORTCUTS = [
  "Diabète",
  "Hypertension",
  "Paracétamol",
  "Asthme",
  "Trouver une structure",
  "Soutenir un besoin",
];

export const SENEGAL_REGIONS = [
  "Toutes les régions",
  "Dakar",
  "Thiès",
  "Saint-Louis",
  "Ziguinchor",
  "Kaolack",
  "Diourbel",
  "Louga",
  "Tambacounda",
];

export const HEALTH_INTERESTS = [
  "Diabète",
  "Hypertension",
  "Santé maternelle",
  "Nutrition",
  "Santé mentale",
  "Cardiologie",
  "Pédiatrie",
  "Asthme",
];

export const ROLE_LABELS: Record<Role, string> = {
  patient_public: "Patient",
  healthcare_facility: "Structure de santé",
  partner: "Partenaire",
  partner_donor: "Donateur",
  admin: "Administrateur",
};

/** Predefined donation amounts (FCFA). */
export const DONATION_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 200000];

export const PAYMENT_METHODS = [
  { id: "wave", label: "Wave" },
  { id: "mobile_money", label: "Mobile Money" },
  { id: "card", label: "Carte bancaire" },
];

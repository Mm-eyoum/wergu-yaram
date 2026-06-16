import type {
  AwareCategory,
  ContentType,
  NeedStatus,
  OrganizationType,
  PartnerCategory,
  Role,
  Urgency,
} from "@/types/domain";

/** Primary navigation (the destinations kept as top-level header buttons). */
export const PRIMARY_NAV: { label: string; to: string }[] = [
  { label: "Portail Santé", to: "/" },
  { label: "Carte", to: "/carte" },
  { label: "Communautés", to: "/communautes" },
  { label: "Forum", to: "/forum" },
  { label: "Équipements", to: "/besoins" },
  { label: "Partenaires", to: "/partenaires" },
];

/**
 * Content verticals grouped under the central "Explorer" mega-menu.
 * Each opens /recherche on its corresponding tab (read by SearchResults).
 * Icons are mapped by `key` inside ExploreMenu (this file stays JSX-free).
 */
export const EXPLORE_CATEGORIES: {
  key: ContentType;
  label: string;
  description: string;
  to: string;
}[] = [
  { key: "pathologie", label: "Pathologies", description: "Comprendre une maladie", to: "/recherche?type=pathologie" },
  { key: "medicament", label: "Médicaments", description: "Référentiel essentiel (DCI)", to: "/recherche?type=medicament" },
  { key: "symptome", label: "Symptômes", description: "S'orienter selon les signes", to: "/recherche?type=symptome" },
  { key: "etablissement", label: "Établissements", description: "Structures à proximité", to: "/recherche?type=etablissement" },
  { key: "article", label: "Articles", description: "Contenus vérifiés", to: "/recherche?type=article" },
  { key: "video", label: "Vidéos", description: "Formats courts", to: "/recherche?type=video" },
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
  { key: "evenement", label: "Événements" },
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

/** Catégories AWaRe de l'OMS pour les antibiotiques. */
export const AWARE_LABELS: Record<AwareCategory, string> = {
  Access: "Access",
  Watch: "Watch",
  Reserve: "Reserve",
};

/** Niveaux d'urgence d'un besoin en équipement. */
export const URGENCY_LABELS: Record<Urgency, string> = {
  urgent: "Urgent",
  eleve: "Élevé",
  modere: "Modéré",
};

/** État de financement d'un besoin. */
export const NEED_STATUS_LABELS: Record<NeedStatus, string> = {
  en_cours: "En cours",
  finance: "Financé",
  valide: "Validé",
};

/** Modes de déroulement d'un événement. */
export const EVENT_MODES: ("Présentiel" | "En ligne" | "Hybride")[] = [
  "Présentiel",
  "En ligne",
  "Hybride",
];

/** Libellés des catégories de partenaires. */
export const PARTNER_CATEGORY_LABELS: Record<PartnerCategory, string> = {
  ong: "ONG",
  institution: "Institution",
  entreprise: "Entreprise",
  fondation: "Fondation",
  structure: "Structure",
};

export const ROLE_LABELS: Record<Role, string> = {
  patient_public: "Patient",
  editor: "Éditeur",
  admin: "Administrateur",
  super_admin: "Super administrateur",
};

/** Labels for the "page" types a base user can create (Facebook/LinkedIn model). */
export const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  healthcare_facility: "Structure de santé",
  partner: "Partenaire",
  partner_donor: "Donateur",
};

/** Status badges shared by pages (and suspended user accounts). */
export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente de validation",
  active: "Validé",
  suspended: "Suspendu",
};

/** Predefined donation amounts (FCFA). */
export const DONATION_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 200000];

export const PAYMENT_METHODS = [
  { id: "wave", label: "Wave" },
  { id: "mobile_money", label: "Mobile Money" },
  { id: "card", label: "Carte bancaire" },
];

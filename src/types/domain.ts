/** Domain models for Wergu Yaram. */

/**
 * Account roles (a person). Facility/partner/donor are NOT account roles —
 * they are "pages" (see {@link Organization}) created by a `patient_public` user.
 *
 * `editor` is a content-staff role: it manages editorial content (medications,
 * articles, …) via the admin CMS but cannot manage users, roles or settings.
 */
export type Role = "patient_public" | "editor" | "admin" | "super_admin";

export type UserStatus = "pending" | "active" | "suspended";

/** Geographic point used across facilities, events and organization pages. */
export interface Coords {
  lat: number;
  lng: number;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role: Role;
  status: UserStatus;
  region?: string;
  phone?: string;
  /** Preferred UI language (e.g. "fr", "wo", "en"). */
  language?: string;
  interests?: string[];
  createdAt?: string;
  /** Optional reference location for "near me" sorting without re-prompting GPS. */
  homeCoords?: Coords;
}

/** A "page"/organization type a base user can create (Facebook/LinkedIn model). */
export type OrganizationType = "healthcare_facility" | "partner" | "partner_donor";

/** Lifecycle of a page: created `pending` → validated by an admin → `active`. */
export type OrgStatus = "pending" | "active" | "suspended";

/** Where a page came from: created by a user, or imported into the directory. */
export type OrgSource = "user" | "imported";

/**
 * Claim lifecycle for directory listings (imported pages):
 * `unclaimed` → a user requests it (`claim_pending`) → admin approves (`claimed`).
 * User-created pages are implicitly owned and carry no claim status.
 */
export type ClaimStatus = "unclaimed" | "claim_pending" | "claimed";

/**
 * A page created and managed by users. Public listings only show `active` ones.
 * Owner/managers may edit the profile but never change `status` (admin-only).
 */
export interface Organization {
  id: string;
  type: OrganizationType;
  name: string;
  ownerUid: string;
  managerUids: string[];
  status: OrgStatus;
  region?: string;
  description?: string;
  logo?: string | null;
  /** Free-form profile payload specific to the org type (facility/partner fields). */
  profile?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  // --- Geolocation ---
  address?: string;
  city?: string;
  coords?: Coords;
  // --- Directory / claim (admin import via Google Places) ---
  source?: OrgSource;
  /** Google Places `place_id`, used to dedupe imports. */
  placeId?: string;
  claimStatus?: ClaimStatus;
  // --- Enriched data from Places imports ---
  phone?: string;
  hours?: string;
  rating?: number;
  photoUrl?: string | null;
}

/** A request by a user to take ownership of an imported directory listing. */
export type ClaimRequestStatus = "pending" | "approved" | "rejected";

export interface ClaimRequest {
  id: string;
  orgId: string;
  orgName: string;
  requesterUid: string;
  requesterName: string;
  justification: string;
  status: ClaimRequestStatus;
  createdAt?: string;
}

/** Type of any searchable content — drives the universal search & result tabs. */
export type ContentType =
  | "pathologie"
  | "medicament"
  | "symptome"
  | "article"
  | "video"
  | "etablissement"
  | "communaute"
  | "evenement"
  | "besoin"
  | "partenaire";

export interface TrustMeta {
  verified: boolean;
  source?: string;
  updatedAt?: string;
}

/**
 * Niveaux de soins du système sanitaire (LME Burkina / UEMOA) :
 * CSPS (Centre de Santé et de Promotion Sociale), CM (Centre Médical),
 * CMA (Centre Médical avec Antenne chirurgicale), CH (Centre Hospitalier).
 * `true` = produit disponible/autorisé à ce niveau.
 */
export interface CareLevels {
  csps: boolean;
  cm: boolean;
  cma: boolean;
  ch: boolean;
}

/**
 * Une présentation = un couple forme galénique + dosage avec sa disponibilité
 * par niveau de soins. Le Règlement UEMOA N°04/2020 (art. 24) traite chaque
 * dosage / forme / présentation comme une AMM distincte ; on les regroupe donc
 * sous un même DCI mais on conserve le détail par présentation.
 */
export interface Presentation {
  form: string; // "Comprimé", "Injectable", "Sirop"…
  dosage?: string; // "500 mg", "10 mg/ml ; 1 ml"
  careLevels: CareLevels;
  populations: ("adulte" | "enfant")[];
  note?: string; // restriction de bas de tableau (ex. "Limité à l'enfant de plus de 3 mois")
}

/** Catégorie AWaRe (OMS) de bon usage des antibiotiques. */
export type AwareCategory = "Access" | "Watch" | "Reserve";

/**
 * Métadonnées réglementaires (conformité Règlement UEMOA N°04/2020).
 * Le référentiel est informationnel et non promotionnel : pas de marque
 * commerciale ni de prix, nommage en DCI, attribution de source obligatoire.
 */
export interface RegulatoryMeta {
  /** Autorité de réglementation pharmaceutique source des données. */
  authority: string;
  /** Liste / édition de référence (ex. "LME Burkina Faso 2023"). */
  listEdition: string;
  /** Une AMM est requise avant toute commercialisation (art. 7). */
  ammRequired: boolean;
  /** Durée de validité d'une AMM en années (art. 16 : 5 ans). */
  ammValidityYears?: number;
}

export interface Medication {
  slug: string;
  /** CMS publish state. Absent ⇒ treated as published (back-compat with seed). */
  published?: boolean;
  /** Dénomination Commune Internationale (INN) — nom canonique de la fiche. */
  dci?: string;
  name: string;
  /** Dosage résumé (dérivé de `presentations` pour rétro-compat / affichage). */
  dosage: string;
  family: string;
  /** Formes résumées (dérivées de `presentations` pour rétro-compat / affichage). */
  forms: string[];
  /** Présentations détaillées (forme + dosage + niveaux de soins). */
  presentations?: Presentation[];
  /** Groupe pharmaco-thérapeutique de la LME (ex. "Anti-infectieux"). */
  pharmacoTherapeuticGroup?: string;
  subgroup?: string;
  /** Catégorie AWaRe pour les antibiotiques. */
  awareCategory?: AwareCategory;
  /** Médicament essentiel (présent sur une liste nationale). */
  essentialMedicine?: boolean;
  /** Nature du produit : générique (DCI) par défaut, ou spécialité. */
  productNature?: "generique" | "specialite";
  regulatory?: RegulatoryMeta;
  summary: string;
  // --- Contenu clinique (enrichi hors PDF : optionnel + sourcé + étiqueté) ---
  usage?: string;
  posology?: string;
  contraindications?: string[];
  sideEffects?: string[];
  precautions?: string[];
  interactions?: string[];
  professionalAdvice?: string;
  /** Sources du contenu clinique (OMS, RCP…). */
  clinicalSources?: string[];
  /** Statut de revue du contenu clinique enrichi. */
  clinicalReviewStatus?: "draft" | "reviewed";
  relatedPathologies?: string[]; // pathology slugs
  withoutPrescription: boolean;
  trust: TrustMeta;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Pathology {
  slug: string;
  published?: boolean;
  name: string;
  category: string;
  /** Optional illustrative header image; falls back to a generic icon. */
  image?: string;
  summary: string;
  understanding: string;
  symptoms: string[];
  causes: string[];
  prevention: string[];
  treatments: string[];
  whenToConsult: string[];
  faq: FaqItem[];
  commonMedications: string[]; // medication slugs
  relatedArticles: string[]; // article slugs
  nearbyFacilities: string[]; // facility slugs
  communitySlug?: string;
  trust: TrustMeta;
}

export interface Article {
  slug: string;
  published?: boolean;
  title: string;
  excerpt: string;
  category: string;
  cover: string;
  author: { name: string; role: string };
  readingMinutes: number;
  publishedAt: string;
  toc: { id: string; label: string }[];
  body: { id: string; heading: string; paragraphs: string[]; bullets?: string[] }[];
  relatedArticles: string[];
  relatedMedications: string[];
  sources: { label: string; org: string }[];
  type: "article" | "video";
  videoDurationLabel?: string;
  trust: TrustMeta;
}

export interface Facility {
  slug: string;
  published?: boolean;
  name: string;
  type: string; // "Hôpital public", "Clinique privée"…
  region: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  cover: string;
  description: string;
  specialties: string[];
  services: string[];
  capacity: string;
  hours: string;
  rating: number;
  reviewsCount: number;
  doctors: { name: string; specialty: string }[];
  reviews: { author: string; rating: number; comment: string; date: string }[];
  coords: { lat: number; lng: number };
  equipmentNeeds: string[]; // equipment need ids
  verified: boolean;
}

export interface CommunityPost {
  id: string;
  /** Firestore owner — REQUIRED on real writes (rules enforce authorUid == auth.uid). */
  authorUid?: string;
  author: { name: string; role?: string };
  timeAgo: string;
  content: string;
  tags?: string[];
  likes: number;
  comments: number;
  shares: number;
}

export interface Community {
  slug: string;
  published?: boolean;
  name: string;
  topic: string;
  description: string;
  membersCount: number;
  postsCount: number;
  isPublic: boolean;
  rules: string[];
  resources: { title: string; type: string }[];
  upcomingEvents: string[]; // event ids
  posts: CommunityPost[];
}

export type Urgency = "urgent" | "eleve" | "modere";
export type NeedStatus = "en_cours" | "finance" | "valide";

export interface EquipmentNeed {
  id: string;
  /** CMS publish state (distinct from `status`, which is the funding state). */
  published?: boolean;
  title: string;
  facilitySlug: string;
  facilityName: string;
  region: string;
  category: string;
  urgency: Urgency;
  status: NeedStatus;
  cover: string;
  shortDescription: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  donorsCount: number;
  daysLeft: number;
  impact: string[];
  budget: { label: string; amount: number }[];
  updates: { date: string; title: string; text: string }[];
  documents: { label: string; type: string }[];
  gallery: string[];
}

export interface HealthEvent {
  id: string;
  published?: boolean;
  title: string;
  cover: string;
  summary: string;
  startAt: string;
  endAt: string;
  timeLabel: string;
  location: string;
  city: string;
  organizer: string;
  mode: "Présentiel" | "En ligne" | "Hybride";
  price: string;
  seatsLeft: number;
  about: string;
  audience: string[];
  program: { time: string; title: string }[];
  speakers: { name: string; role: string }[];
  practicalInfo: { label: string; value: string }[];
  communitySlug?: string;
  relatedEvents: string[];
  coords: { lat: number; lng: number };
}

export type PartnerCategory =
  | "ong"
  | "institution"
  | "entreprise"
  | "fondation"
  | "structure";

export interface Partner {
  slug: string;
  published?: boolean;
  name: string;
  category: PartnerCategory;
  categoryLabel: string;
  zone: string;
  logo: string;
  description: string;
  featured?: boolean;
  contributionsLabel: string;
  tags: string[];
}

export type ForumKind = "question" | "discussion" | "conseil";

export interface ForumThread {
  id: string;
  /** Firestore owner — REQUIRED on real writes (rules enforce authorUid == auth.uid). */
  authorUid?: string;
  title: string;
  excerpt: string;
  kind: ForumKind;
  author: { name: string; role?: string };
  timeAgo: string;
  tags: string[];
  answers: number;
  votes: number;
  views: number;
  solved?: boolean;
}

export interface Conversation {
  id: string;
  /** Member UIDs — REQUIRED on real writes (rules gate read/write on participants). */
  participants?: string[];
  name: string;
  role?: string;
  lastMessage: string;
  timeAgo: string;
  unread: number;
  online: boolean;
  verified?: boolean;
  messages: { id: string; fromMe: boolean; text: string; time: string }[];
  sharedFiles: { name: string; size: string; type: string }[];
}

/**
 * Per-type filterable attributes carried on each search hit so the results page
 * can build faceted filters without re-joining the original entity collections.
 * All fields optional — a hit only sets the facets relevant to its type.
 */
export interface SearchFacets {
  category?: string; // pathologie, article/video, besoin
  family?: string; // medicament
  awareCategory?: AwareCategory; // medicament
  withoutPrescription?: boolean; // medicament
  essentialMedicine?: boolean; // medicament
  facilityType?: string; // etablissement (Facility.type)
  region?: string; // etablissement, besoin
  city?: string; // etablissement, evenement
  specialties?: string[]; // etablissement
  rating?: number; // etablissement (tri)
  topic?: string; // communaute
  isPublic?: boolean; // communaute
  membersCount?: number; // communaute (tri)
  mode?: HealthEvent["mode"]; // evenement
  startAt?: string; // evenement (tri/date)
  urgency?: Urgency; // besoin
  needStatus?: NeedStatus; // besoin
  daysLeft?: number; // besoin (tri)
  partnerCategory?: PartnerCategory; // partenaire
  zone?: string; // partenaire
  readingMinutes?: number; // article (tri)
  publishedAt?: string; // article (tri date)
  articleType?: Article["type"]; // article vs video
}

/** Unified search hit produced by the federated mock index. */
export interface SearchHit {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  href: string;
  meta?: string;
  verified?: boolean;
  badge?: string;
  thumbnail?: string;
  keywords: string;
  /** Structured filterable attributes (drive the per-type faceted filters). */
  facets?: SearchFacets;
}

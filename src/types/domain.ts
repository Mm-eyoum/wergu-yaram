/** Domain models for Wergu Yaram. */
import type { FacilityCategory, FacilitySector, FacilityLevel } from "@/lib/facilityTaxonomy";

/**
 * Account roles (a person). Facility/partner/donor are NOT account roles —
 * they are "pages" (see {@link Organization}) created by a `patient_public` user.
 *
 * `editor` is a content-staff role: it manages editorial content (medications,
 * articles, …) via the admin CMS but cannot manage users, roles or settings.
 */
export type Role = "patient_public" | "health_pro" | "editor" | "admin" | "super_admin";

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
  /** Opt-in pour les campagnes de prévention (ciblées). Défaut : non. */
  smsConsent?: boolean;
  whatsappConsent?: boolean;
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
  // --- Health-structure taxonomy (healthcare_facility orgs) ---
  category?: FacilityCategory;
  sector?: FacilitySector;
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
  // --- Monétisation (Functions-only : posés par le webhook d'abonnement) ---
  /** Palier d'abonnement actif de la page. Absent = page gratuite. */
  planTier?: "verified" | "pro";
  /** Plan tarifaire en cours (cf. PricingPlan.id). */
  planId?: string;
  /** Mise en avant (tri prioritaire annuaire/carte) — réservé au palier Pro. */
  featured?: boolean;
  /** Fin de la période payée (ISO). Au-delà, l'entitlement est retiré. */
  subscribedUntil?: string;
}

/** A request by a user to take ownership of an imported directory listing. */
export type ClaimRequestStatus = "pending" | "approved" | "rejected";

export interface ClaimRequest {
  id: string;
  /** Slug de l'établissement (Facility) revendiqué. */
  facilitySlug?: string;
  facilityName?: string;
  /** Legacy : ancien id d'`organizations` (réclamations créées avant l'unification). */
  orgId?: string;
  orgName?: string;
  requesterUid: string;
  requesterName: string;
  justification: string;
  status: ClaimRequestStatus;
  createdAt?: string;
}

/** Statut d'une demande de vérification « professionnel de santé ». */
export type ProfessionalVerificationStatus = "pending" | "approved" | "rejected";

/**
 * Demande, par un utilisateur, du statut « professionnel de santé vérifié »
 * (rôle {@link Role} `health_pro`). Calquée sur {@link ClaimRequest} : l'utilisateur
 * crée sa demande, un admin l'approuve (→ rôle `health_pro`) ou la rejette.
 */
export interface ProfessionalVerificationRequest {
  id: string;
  requesterUid: string;
  requesterName: string;
  requesterEmail: string;
  /** Justificatif : ordre, diplôme, structure de rattachement… */
  justification: string;
  licenseNumber?: string;
  specialties?: string[];
  status: ProfessionalVerificationStatus;
  createdAt?: string;
}

/**
 * Espace partenaire multi-tenant (modèle ASSAD). Servi sur `<slug>.werguyaram.org`
 * (sous-domaine) ou via `/espace/<slug>`. Agrège du contenu curé à la marque du
 * partenaire, sur l'infrastructure Wergu Yaram.
 */
export interface Tenant {
  /** Sous-domaine : `assad` → assad.werguyaram.org. Sert d'id de document. */
  slug: string;
  published?: boolean;
  name: string;
  description?: string;
  logo?: string | null;
  /** Page/organisation propriétaire (partenaire), optionnel. */
  partnerOrgId?: string;
  /** Compte partenaire propriétaire de l'espace (gère le contenu en autonomie). */
  ownerUid?: string;
  /** Co-gestionnaires de l'espace (en plus du propriétaire). */
  managerUids?: string[];
  /** Quota mensuel de campagnes self-service (anti-abus). `periodKey` = "YYYY-MM". */
  campaignQuota?: { monthly: number; sentThisMonth: number; periodKey: string };
  /** Personnalisation visuelle légère (la charte globale reste le socle). */
  theme?: { accent?: string; banner?: string };
  /** Contenu curé agrégé dans l'espace (slugs/ids existants). */
  communitySlugs?: string[];
  eventIds?: string[];
  articleSlugs?: string[];
  website?: string;
  /** Domaine personnalisé éventuel (sinon `<slug>.werguyaram.org`). */
  domain?: string;
  /** Remonter cet espace comme carte sur la page publique /partenaires (défaut: oui). */
  showOnPartnersPage?: boolean;
  /** Label « Partenaire vérifié » (confiance) — posé par un admin uniquement. */
  verified?: boolean;
  /** Gouvernance & impact de l'espace (comité de pilotage + indicateurs). */
  committee?: TenantCommittee;
}

/**
 * Gouvernance d'un espace partenaire : comité de pilotage multi-acteurs qui
 * **valide les indicateurs d'impact** d'un programme. Embarqué dans le tenant
 * (1 espace ↔ 1 comité), édité depuis l'éditeur d'espace.
 */
export interface TenantCommittee {
  name: string;
  mission?: string;
  members: { name: string; role?: string; org?: string }[];
  /** Indicateurs d'impact mesurables — ex. « Personnes dépistées » : « 1 200 ». */
  indicators: { label: string; value: string }[];
}

/**
 * Offre d'un partenaire affichée sur son espace : prestation, produit/solution,
 * ou appel à projets/financement (selon `kind`). Couvre les verticales métier
 * (tech, médical, bailleurs, médias). Contenu partenaire léger : `slug` = id.
 */
export type PartnerOfferKind = "service" | "produit" | "appel";
export interface PartnerOffer {
  slug: string;
  published?: boolean;
  tenantSlug?: string;
  ownerUid?: string;
  kind: PartnerOfferKind;
  title: string;
  summary: string;
  category?: string;
  image?: string;
  /** Prix / budget / date limite selon le type (ex. « Sur devis », « 50 M XOF », « 30 sept. »). */
  meta?: string;
  ctaLabel?: string;
  /** Lien externe ; si vide, le bouton renvoie vers le formulaire de contact de l'espace. */
  ctaUrl?: string;
}

/**
 * Témoignage / histoire d'impact (preuve sociale) affiché sur l'espace d'un
 * partenaire. Contenu partenaire léger : `slug` = id de document.
 */
export interface Testimonial {
  slug: string;
  published?: boolean;
  tenantSlug?: string;
  ownerUid?: string;
  quote: string;
  authorName: string;
  authorRole?: string;
  org?: string;
  avatar?: string;
}

/** Prospect capturé depuis l'espace d'un partenaire (contact / démo / candidature). */
export type LeadKind = "contact" | "demo" | "candidature";
export interface Lead {
  id: string;
  /** Espace partenaire destinataire. */
  tenantSlug: string;
  kind: LeadKind;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  status?: "new" | "handled";
  createdAt?: string;
}

/** Canal d'une campagne de prévention ciblée (P3). */
export type CampaignChannel = "sms" | "whatsapp";
export type CampaignStatus = "draft" | "sent" | "failed";

/**
 * Campagne de prévention ciblée (SMS/WhatsApp). Le ciblage + l'envoi se font
 * côté serveur (Cloud Function `sendCampaign`) ; le consentement (opt-in) des
 * utilisateurs est requis. Écrite exclusivement par les Functions.
 */
export interface Campaign {
  id: string;
  title: string;
  channel: CampaignChannel;
  message: string;
  /** Segment ciblé (au moins un critère). */
  segment: { interest?: string; region?: string; communitySlug?: string };
  status: CampaignStatus;
  targetedCount?: number;
  sentCount?: number;
  createdByUid?: string;
  createdAt?: string;
  /** Espace partenaire émetteur (campagnes self-service scopées). Vide = campagne admin globale. */
  tenantSlug?: string;
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
  | "partenaire"
  | "formation";

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
  /** Espace partenaire propriétaire (multi-tenant). Vide = contenu global éditorial. */
  tenantSlug?: string;
  /** Compte partenaire ayant créé/possédant ce contenu (gestion autonome). */
  ownerUid?: string;
  /** Nature éditoriale : article standard ou annonce/communiqué (badge dédié). */
  kind?: "standard" | "annonce";
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
  /** Sponsoring optionnel (affiché étiqueté « Contenu sponsorisé »). */
  sponsor?: { name: string; logo?: string; url?: string };
  trust: TrustMeta;
}

/**
 * THE single model for a health establishment, served at /etablissements/:slug
 * (identified by `slug`). Every health structure is a Facility regardless of
 * provenance — created by a user (`source:"user"`), imported by an admin
 * (`source:"imported"`), or editorial (no `source`). Provenance is a status
 * field, NOT a separate collection. `Organization` is reserved for partner /
 * donor pages only. See the route comment in App.tsx for the full boundary.
 */
export interface Facility {
  slug: string;
  published?: boolean;
  name: string;
  /** Legacy free-text label — kept for display fallback; prefer `category`. */
  type?: string;
  /** Structured taxonomy (see lib/facilityTaxonomy). */
  category?: FacilityCategory;
  sector?: FacilitySector;
  level?: FacilityLevel;
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
  // Ownership (user-created or claimed facilities) — absent on editorial entries.
  ownerUid?: string;
  managerUids?: string[];
  // --- Provenance / directory claim ---
  /** "user" (créée par un utilisateur) | "imported" (annuaire admin) | absent = éditorial. */
  source?: OrgSource;
  claimStatus?: ClaimStatus;
  /** Google Places `place_id`, used to dedupe imports. */
  placeId?: string;
  /** Legacy: id of the `organizations` doc this facility was migrated from. */
  sourceOrgId?: string;
  // --- Monétisation (Functions-only : posés par le webhook d'abonnement) ---
  /** Palier d'abonnement actif. Absent = établissement gratuit. */
  planTier?: "verified" | "pro";
  /** Plan tarifaire en cours (cf. PricingPlan.id). */
  planId?: string;
  /** Mise en avant (tri prioritaire annuaire/carte) — réservé au palier Pro. */
  featured?: boolean;
  /** Fin de la période payée (ISO). Au-delà, l'entitlement est retiré. */
  subscribedUntil?: string;
  createdAt?: string;
  updatedAt?: string;
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
  /** Espace partenaire propriétaire (multi-tenant). Vide = contenu global éditorial. */
  tenantSlug?: string;
  /** Compte partenaire ayant créé/possédant ce contenu (gestion autonome). */
  ownerUid?: string;
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
  /** Intérêts santé servis (valeurs de HEALTH_INTERESTS) — pilote la suggestion au signup. */
  relatedInterests?: string[];
  /** Pathologies (MNT) rattachées à la communauté (slugs). */
  pathologySlugs?: string[];
}

export type Urgency = "urgent" | "eleve" | "modere";
export type NeedStatus = "en_cours" | "finance" | "valide";

export interface EquipmentNeed {
  id: string;
  /** CMS publish state (distinct from `status`, which is the funding state). */
  published?: boolean;
  /** Espace partenaire propriétaire (multi-tenant). Vide = contenu global éditorial. */
  tenantSlug?: string;
  /** Compte partenaire ayant créé/possédant ce contenu (gestion autonome). */
  ownerUid?: string;
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
  /** Espace partenaire propriétaire (multi-tenant). Vide = contenu global éditorial. */
  tenantSlug?: string;
  /** Compte partenaire ayant créé/possédant ce contenu (gestion autonome). */
  ownerUid?: string;
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
  /** Libellé d'affichage du tarif ("Gratuit", "5 000 XOF"…) — rétro-compat. */
  price: string;
  /** Thème pour les collections de la page d'accueil événements (optionnel). */
  category?: string;
  /** Mis en avant sur la page d'accueil événements. */
  featured?: boolean;
  // --- Billetterie (Ligne 3) ---
  /** Prix unitaire en XOF. 0/absent = gratuit (inscription sans paiement). */
  priceAmount?: number;
  /** Commission plateforme (0–1). Défaut 0,09 si non défini. */
  commissionRate?: number;
  /** Active l'achat de billet en ligne. */
  ticketingEnabled?: boolean;
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

/** Formation / e-learning (Ligne académique). Catalogue MVP : pas de LMS interne. */
export type FormationLevel = "debutant" | "intermediaire" | "avance";
export type FormationFormat = "e-learning" | "webinaire" | "presentiel" | "hybride";

export interface Formation {
  slug: string;
  published?: boolean;
  /** Espace partenaire propriétaire (multi-tenant). Vide = contenu global éditorial. */
  tenantSlug?: string;
  /** Compte partenaire ayant créé/possédant ce contenu (gestion autonome). */
  ownerUid?: string;
  title: string;
  excerpt: string;
  cover?: string;
  /** Thème (ex. "Diabète", "Prévention", "Santé maternelle"). */
  category?: string;
  level: FormationLevel;
  format: FormationFormat;
  /** Durée affichée (ex. "3 h", "5 modules"). */
  durationLabel?: string;
  audience: string[];
  /** Organisme de formation (partenaire académique). */
  provider?: { name: string; role?: string };
  modules: { title: string; summary?: string; durationLabel?: string }[];
  objectives: string[];
  certification?: boolean;
  /** Évaluation (LMS léger) : réussite → certificat. `answer` = index de la bonne réponse. */
  quiz?: { question: string; options: string[]; answer: number }[];
  /** Lien d'inscription / d'accès (webinaire, plateforme) — MVP sans LMS interne. */
  enrollUrl?: string;
  /** Webinaire lié (id d'un HealthEvent), le cas échéant. */
  relatedEventId?: string;
  trust?: TrustMeta;
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
  /** Sponsoring optionnel (affiché étiqueté « Contenu sponsorisé »). */
  sponsor?: { name: string; logo?: string; url?: string };
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
  facilityType?: string; // etablissement (category label, ex-Facility.type)
  sector?: string; // etablissement (secteur)
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

// ---------------------------------------------------------------------------
// Monétisation — registre transactionnel unifié (scaffold)
// ---------------------------------------------------------------------------
// Ces entités sous-tendent toutes les lignes de revenu (dons, pages, billetterie,
// sponsoring…). Le rail paiement reste Bictorys (cf. functions/src/index.ts) ;
// `transactions` est la source unique pour le reporting. Montants en XOF.

/** Ligne de business à laquelle un revenu est rattaché (pour le reporting). */
export type LineOfBusiness = "donations" | "pages" | "events" | "content" | "data" | "partners";

/** Type de modèle économique porté par un plan tarifaire. */
export type RevenueModel = "one_time" | "subscription" | "commission" | "freemium";

/** Périodicité de facturation d'un plan. */
export type BillingPeriod = "monthly" | "yearly" | "one_time";

/** Un plan tarifaire (abonnement page, billet type, etc.). */
export interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  lineOfBusiness: LineOfBusiness;
  model: RevenueModel;
  /** Prix en XOF. */
  price: number;
  currency: "XOF";
  billingPeriod: BillingPeriod;
  /** Ce qui est inclus (affiché sur la grille tarifaire). */
  features: string[];
  /** Quotas / limitations optionnels (ex. { photos: 10 }). */
  limits?: Record<string, number>;
  isActive: boolean;
  sortOrder: number;
  trialDays?: number | null;
}

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";

/** Abonnement récurrent (page structure premium, don mensuel…). */
export interface Subscription {
  id: string;
  subscriberUid: string;
  /** Renseigné si l'abonnement porte sur une page (Organization partenaire/donateur). */
  orgId?: string;
  /** Renseigné si l'abonnement porte sur un établissement de santé (Facility). */
  facilitySlug?: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  provider: "bictorys";
  providerSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TxnType =
  | "donation"
  | "donation_tip"
  | "subscription"
  | "ticket"
  | "commission"
  | "refund"
  | "payout"
  | "sponsorship";

export type TxnStatus = "pending" | "completed" | "failed" | "refunded";

/**
 * Écriture unique de référence pour chaque mouvement financier.
 * Écrite exclusivement par les Cloud Functions (cf. règles Firestore).
 * `amount` = montant total perçu ; `netAmount` = reversé au bénéficiaire ;
 * `platformAmount` = part plateforme (pourboire/commission) ; `fees` = frais agrégateur.
 */
export interface Transaction {
  id: string;
  type: TxnType;
  lineOfBusiness: LineOfBusiness;
  payerUid?: string;
  /** Référence métier : needId / eventId / orgId / planId selon le type. */
  refId?: string;
  amount: number;
  currency: "XOF";
  fees: number;
  platformAmount: number;
  netAmount: number;
  status: TxnStatus;
  paymentMethod?: "wave" | "orange_money" | "mtn_money" | "card";
  providerTransactionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/** Commission due à un bénéficiaire (organisateur/vendeur) + suivi de reversement. */
export interface Commission {
  id: string;
  transactionId: string;
  beneficiaryUid: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  payoutStatus: "pending" | "processed" | "paid";
  payoutDate?: string;
  payoutReference?: string;
  createdAt: string;
}

/** Agrégat de revenus pré-calculé par période et par ligne (pour le dashboard). */
export interface RevenueReport {
  id: string;
  period: "daily" | "weekly" | "monthly";
  date: string;
  lineOfBusiness: LineOfBusiness;
  grossRevenue: number;
  fees: number;
  commissions: number;
  netRevenue: number;
  transactionsCount: number;
  newCustomers: number;
  churnedCustomers: number;
  createdAt: string;
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
  /** Espace partenaire propriétaire (attribution « Proposé par … » dans les résultats). */
  tenantSlug?: string;
  /** Structured filterable attributes (drive the per-type faceted filters). */
  facets?: SearchFacets;
}

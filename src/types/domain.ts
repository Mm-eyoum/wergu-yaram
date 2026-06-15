/** Domain models for Wergu Yaram. */

export type Role =
  | "patient_public"
  | "healthcare_facility"
  | "partner"
  | "partner_donor"
  | "admin";

export type UserStatus = "pending" | "active" | "suspended";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role: Role;
  status: UserStatus;
  region?: string;
  interests?: string[];
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

export interface Medication {
  slug: string;
  name: string;
  dosage: string;
  family: string;
  forms: string[];
  summary: string;
  usage: string;
  posology: string;
  contraindications: string[];
  sideEffects: string[];
  precautions: string[];
  interactions: string[];
  professionalAdvice: string;
  relatedPathologies: string[]; // pathology slugs
  withoutPrescription: boolean;
  trust: TrustMeta;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Pathology {
  slug: string;
  name: string;
  category: string;
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
}

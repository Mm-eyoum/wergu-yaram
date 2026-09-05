/**
 * Inventaire des collections Firestore à migrer, et leur destination en D1.
 *
 * Source de vérité partagée par l'export, la transformation, le chargement et la
 * vérification de parité : une seule liste, pour qu'aucun script ne puisse en
 * oublier une.
 */

/** Ressources du CMS → table générique `documents` (cf. migration 0001). */
export const DOCUMENT_COLLECTIONS = [
  "medications",
  "pathologies",
  "articles",
  "facilities",
  "communities",
  "equipmentNeeds",
  "events",
  "formations",
  "partners",
  "partnerOffers",
  "testimonials",
  "tenants",
] as const;

/** Collections de premier niveau adossées à une table typée. */
export const TYPED_COLLECTIONS = [
  "users",
  "organizations",
  "claimRequests",
  "professionalVerificationRequests",
  "forumThreads",
  "conversations",
  "media",
  "auditLogs",
  "pricingPlans",
  "subscriptions",
  "transactions",
  "campaigns",
  "leads",
  "memberships",
  "newsletterSignups",
  "supportIntents",
  "tenantReports",
  "donations",
  "pendingCharges",
  "tickets",
  "commissions",
  "revenueReports",
] as const;

/** Documents à id fixe. */
export const SINGLETON_COLLECTIONS = ["settings"] as const;

/**
 * Volontairement NON migrées.
 * `pageViews` : un document par vue, jamais lu par le client, déjà agrégé chaque
 * nuit. Remplacée par la table pré-agrégée `page_view_daily`, qui repart à zéro.
 */
export const SKIPPED_COLLECTIONS = ["pageViews"] as const;

/** Sous-collections de `users/{uid}`. */
export const USER_SUBCOLLECTIONS = [
  "favorites",
  "savedSearches",
  "reminders",
  "memberships",
  "conversationReads",
  "formationProgress",
  "notifications",
] as const;

/** Sous-collections atteintes par requête de groupe. */
export const GROUP_SUBCOLLECTIONS = [
  { group: "posts", parent: "communities" },
  { group: "messages", parent: "conversations" },
] as const;

export const ALL_TOP_LEVEL = [
  ...DOCUMENT_COLLECTIONS,
  ...TYPED_COLLECTIONS,
  ...SINGLETON_COLLECTIONS,
] as const;

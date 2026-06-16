/**
 * Catalog service — async access to the public read-only content
 * (medications, pathologies, articles, facilities, communities,
 * equipment needs, events, partners).
 *
 * Strategy: read from Firestore when configured, and **fall back to the
 * bundled mock data** when Firebase is absent or the collection is empty.
 * This keeps the app fully functional before/while the Firestore content is
 * seeded, and lets pages migrate to async data without going blank.
 *
 * Seed convention (see scripts/seed.ts): each document id is the entity's
 * `slug` (or `id` for events/equipment needs), so single-item lookups can
 * read the document directly.
 */
import { collection, doc, getDoc, getDocs, limit, query } from "firebase/firestore";
import { db } from "./firebase";
import { reportError } from "@/lib/errorReporting";
import type {
  Article,
  Community,
  EquipmentNeed,
  Facility,
  HealthEvent,
  Medication,
  Partner,
  Pathology,
} from "@/types/domain";

// Bundled mock data (also still used synchronously by SEO/sitemap & search).
import {
  articleBySlug,
  articles,
  communities,
  communityBySlug,
  equipmentNeedById,
  equipmentNeeds,
  eventById,
  events,
  facilities,
  facilityBySlug,
  medicationBySlug,
  medications,
  partnerBySlug,
  partners,
  pathologies,
  pathologyBySlug,
} from "./content";

// Hard cap on a single catalog read. Catalog collections are curated content;
// this bounds reads/cost/memory and is large enough to cover the full catalog
// for the foreseeable future. Switch to cursor pagination if a list outgrows it.
const CATALOG_PAGE_SIZE = 500;

/** A document is public unless it was explicitly unpublished in the CMS. */
function isPublic(data: unknown): boolean {
  return (data as { published?: boolean }).published !== false;
}

/** List a collection from Firestore, falling back to mock when empty/absent. */
async function listOrMock<T>(collectionName: string, fallback: T[]): Promise<T[]> {
  if (!db) return fallback;
  try {
    const snap = await getDocs(query(collection(db, collectionName), limit(CATALOG_PAGE_SIZE)));
    if (snap.empty) return fallback;
    // Drafts (published === false) are hidden from the public site.
    return snap.docs.map((d) => d.data() as T).filter(isPublic);
  } catch (err) {
    // Network/permission error → degrade gracefully to mock, but surface the
    // cause so a misconfiguration (e.g. denied rules) is not silently masked.
    reportError(err, { scope: "catalog.listOrMock", collection: collectionName });
    return fallback;
  }
}

/** Read one document (id === slug/id) from Firestore, falling back to mock. */
async function oneOrMock<T>(
  collectionName: string,
  id: string | undefined,
  fallback: T | undefined,
): Promise<T | null> {
  if (!id) return null;
  if (!db) return fallback ?? null;
  try {
    const snap = await getDoc(doc(db, collectionName, id));
    if (snap.exists()) {
      // A draft document 404s on the public site (admins use the admin services).
      return isPublic(snap.data()) ? (snap.data() as T) : null;
    }
    return fallback ?? null;
  } catch (err) {
    reportError(err, { scope: "catalog.oneOrMock", collection: collectionName, id });
    return fallback ?? null;
  }
}

// --- Lists ---
export const getMedications = () => listOrMock<Medication>("medications", medications);
export const getPathologies = () => listOrMock<Pathology>("pathologies", pathologies);
export const getArticles = () => listOrMock<Article>("articles", articles);
export const getFacilities = () => listOrMock<Facility>("facilities", facilities);
export const getCommunities = () => listOrMock<Community>("communities", communities);
export const getEquipmentNeeds = () => listOrMock<EquipmentNeed>("equipmentNeeds", equipmentNeeds);
export const getEvents = () => listOrMock<HealthEvent>("events", events);
export const getPartners = () => listOrMock<Partner>("partners", partners);

// --- Single items ---
export const getMedicationBySlug = (slug?: string) =>
  oneOrMock<Medication>("medications", slug, slug ? medicationBySlug(slug) : undefined);
export const getPathologyBySlug = (slug?: string) =>
  oneOrMock<Pathology>("pathologies", slug, slug ? pathologyBySlug(slug) : undefined);
export const getArticleBySlug = (slug?: string) =>
  oneOrMock<Article>("articles", slug, slug ? articleBySlug(slug) : undefined);
export const getFacilityBySlug = (slug?: string) =>
  oneOrMock<Facility>("facilities", slug, slug ? facilityBySlug(slug) : undefined);
export const getCommunityBySlug = (slug?: string) =>
  oneOrMock<Community>("communities", slug, slug ? communityBySlug(slug) : undefined);
export const getEquipmentNeedById = (id?: string) =>
  oneOrMock<EquipmentNeed>("equipmentNeeds", id, id ? equipmentNeedById(id) : undefined);
export const getEventById = (id?: string) =>
  oneOrMock<HealthEvent>("events", id, id ? eventById(id) : undefined);
export const getPartnerBySlug = (slug?: string) =>
  oneOrMock<Partner>("partners", slug, slug ? partnerBySlug(slug) : undefined);

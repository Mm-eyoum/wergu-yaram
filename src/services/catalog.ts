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
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { reportError } from "@/lib/errorReporting";
import type {
  Article,
  Community,
  EquipmentNeed,
  Facility,
  Formation,
  HealthEvent,
  Medication,
  Partner,
  Pathology,
  Tenant,
} from "@/types/domain";

// TRANSITIONAL — bundled mock data used as the offline/empty-Firestore fallback
// below. ⚠️ Because the SEO prerender (scripts/prerender.mjs) reads the same
// mock, running `npm run build:seo` against an UNSEEDED Firestore embeds mock
// content into the prerendered HTML. Always seed Firestore (scripts/seed.ts)
// BEFORE a production build:seo. Migration target: remove these once Firestore
// is fully seeded and the SEO + search pipelines read live data. See
// DEPLOYMENT.md §4–§5.
//
// NOTE: the medication dataset (848 KB) is loaded **lazily** via
// `medicationsLazy` so it stays out of the initial bundle; it is only fetched
// when this fallback actually runs (no/empty Firestore).
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
  formationBySlug,
  formations,
  partnerBySlug,
  partners,
  pathologies,
  pathologyBySlug,
  tenantBySlug,
  tenants,
} from "./content";
import { getMockMedications, getMockMedicationBySlug } from "@/data/medicationsLazy";

/** A fallback may be an eager value or a lazily-loaded one (dynamic import). */
type Lazy<T> = T | (() => T | Promise<T>);
async function resolveLazy<T>(value: Lazy<T>): Promise<T> {
  return typeof value === "function" ? await (value as () => T | Promise<T>)() : value;
}

// Hard cap on a single catalog read. Catalog collections are curated content;
// this bounds reads/cost/memory and is large enough to cover the full catalog
// for the foreseeable future. Switch to cursor pagination if a list outgrows it.
const CATALOG_PAGE_SIZE = 500;

/** A document is public unless it was explicitly unpublished in the CMS. */
function isPublic(data: unknown): boolean {
  return (data as { published?: boolean }).published !== false;
}

/**
 * Whether the bundled mock data may stand in for an empty/absent Firestore.
 * Allowed in dev (offline work, before seeding) and when explicitly opted into,
 * but NEVER in a normal production build — there an unseeded/unreachable
 * collection yields an empty result and the page shows an honest empty state,
 * rather than presenting invented content as real. Seed Firestore before a
 * production build:seo (see DEPLOYMENT.md §4–§5).
 */
const ALLOW_MOCK_FALLBACK = (() => {
  const flag = import.meta.env.VITE_ALLOW_MOCK_FALLBACK;
  if (flag === "true") return true; // explicit opt-in (e.g. a staging build)
  if (flag === "false") return false; // explicit opt-out
  return import.meta.env.DEV; // default: dev only, never a plain prod build
})();

/** List a collection from Firestore; fall back to mock only when allowed. */
async function listOrMock<T>(collectionName: string, fallback: Lazy<T[]>): Promise<T[]> {
  if (!db) return ALLOW_MOCK_FALLBACK ? resolveLazy(fallback) : [];
  try {
    const snap = await getDocs(query(collection(db, collectionName), limit(CATALOG_PAGE_SIZE)));
    if (snap.empty) return ALLOW_MOCK_FALLBACK ? resolveLazy(fallback) : [];
    // Drafts (published === false) are hidden from the public site.
    return snap.docs.map((d) => d.data() as T).filter(isPublic);
  } catch (err) {
    // Network/permission error → surface the cause so a misconfiguration (e.g.
    // denied rules) is not silently masked, then degrade: mock in dev, empty in prod.
    reportError(err, { scope: "catalog.listOrMock", collection: collectionName });
    return ALLOW_MOCK_FALLBACK ? resolveLazy(fallback) : [];
  }
}

/** Read one document (id === slug/id) from Firestore; mock only when allowed. */
async function oneOrMock<T>(
  collectionName: string,
  id: string | undefined,
  fallback: Lazy<T | undefined>,
): Promise<T | null> {
  if (!id) return null;
  const mock = async () => (ALLOW_MOCK_FALLBACK ? ((await resolveLazy(fallback)) ?? null) : null);
  if (!db) return mock();
  try {
    const snap = await getDoc(doc(db, collectionName, id));
    if (snap.exists()) {
      // A draft document 404s on the public site (admins use the admin services).
      return isPublic(snap.data()) ? (snap.data() as T) : null;
    }
    return mock();
  } catch (err) {
    reportError(err, { scope: "catalog.oneOrMock", collection: collectionName, id });
    return mock();
  }
}

// --- Lists ---
export const getMedications = () => listOrMock<Medication>("medications", getMockMedications);
export const getPathologies = () => listOrMock<Pathology>("pathologies", pathologies);
export const getArticles = () => listOrMock<Article>("articles", articles);
export const getFacilities = () => listOrMock<Facility>("facilities", facilities);
export const getCommunities = () => listOrMock<Community>("communities", communities);
export const getEquipmentNeeds = () => listOrMock<EquipmentNeed>("equipmentNeeds", equipmentNeeds);
export const getEvents = () => listOrMock<HealthEvent>("events", events);
export const getPartners = () => listOrMock<Partner>("partners", partners);
export const getFormations = () => listOrMock<Formation>("formations", formations);

// --- Single items ---
export const getMedicationBySlug = (slug?: string) =>
  oneOrMock<Medication>("medications", slug, slug ? () => getMockMedicationBySlug(slug) : undefined);
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
export const getFormationBySlug = (slug?: string) =>
  oneOrMock<Formation>("formations", slug, slug ? () => formationBySlug(slug) : undefined);
export const getTenants = () => listOrMock<Tenant>("tenants", tenants);
export const getTenantBySlug = (slug?: string) =>
  oneOrMock<Tenant>("tenants", slug, slug ? () => tenantBySlug(slug) : undefined);

/**
 * Tenant-scoped public lists — published content tagged to a partner space
 * (`tenantSlug == slug`). Single-field filter (auto-indexed). Empty when
 * Firestore is absent (no mock fallback: scoping is meaningless on bundled mock).
 */
async function listByTenant<T>(collectionName: string, slug: string | undefined): Promise<T[]> {
  if (!db || !slug) return [];
  try {
    const snap = await getDocs(
      query(collection(db, collectionName), where("tenantSlug", "==", slug), limit(CATALOG_PAGE_SIZE)),
    );
    return snap.docs.map((d) => d.data() as T).filter(isPublic);
  } catch (err) {
    reportError(err, { scope: "catalog.listByTenant", collection: collectionName });
    return [];
  }
}

export const getTenantCommunities = (slug?: string) => listByTenant<Community>("communities", slug);
export const getTenantEvents = (slug?: string) => listByTenant<HealthEvent>("events", slug);
export const getTenantArticles = (slug?: string) => listByTenant<Article>("articles", slug);
export const getTenantFormations = (slug?: string) => listByTenant<Formation>("formations", slug);
export const getTenantEquipmentNeeds = (slug?: string) => listByTenant<EquipmentNeed>("equipmentNeeds", slug);

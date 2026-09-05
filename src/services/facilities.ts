/**
 * Facilities — owner & admin operations beyond the public catalog (catalog.ts).
 *
 * A facility migrated from a claimed directory listing carries an `ownerUid`.
 * Its owner edits the content fields here; every owner write is forced back to
 * `published:false`/`verified:false` so an admin must re-validate before it is
 * publicly visible (Firestore rules enforce the same invariant server-side).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "@/services/db";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { slugify } from "@/lib/slug";
import { validateText } from "@/lib/validation";
import type { FacilityCategory, FacilitySector } from "@/lib/facilityTaxonomy";
import type { Coords, Facility } from "@/types/domain";

const COLLECTION = "facilities";
const LIST_LIMIT = 200;

/** A facilities slug not already taken (suffixes -2, -3… on collision). */
export async function uniqueFacilitySlug(name: string): Promise<string> {
  if (!db) return slugify(name) || "etablissement";
  const base = slugify(name) || "etablissement";
  let candidate = base;
  for (let n = 2; n <= 50; n++) {
    const snap = await getDoc(doc(db, COLLECTION, candidate));
    if (!snap.exists()) return candidate;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export interface CreateFacilityInput {
  name: string;
  region?: string;
  description?: string;
  address?: string;
  city?: string;
  coords?: Coords | null;
  category?: FacilityCategory;
  sector?: FacilitySector;
}

/**
 * Create a health establishment owned by the current user. Always starts
 * unpublished/unverified — an admin validates it before it goes public
 * (Firestore rules enforce the same invariant). Returns the new slug.
 */
export async function createFacilityAsOwner(user: User, input: CreateFacilityInput): Promise<string> {
  if (!db) throw new Error("Firebase non configuré.");
  const name = validateText("organizationName", input.name, "Le nom de l'établissement");
  const slug = await uniqueFacilitySlug(name);
  await setDoc(doc(db, COLLECTION, slug), {
    slug,
    published: false,
    verified: false,
    name,
    type: "",
    ...(input.category ? { category: input.category } : {}),
    ...(input.sector ? { sector: input.sector } : {}),
    region: input.region ?? "",
    city: input.city ?? "",
    address: input.address ?? "",
    phone: "",
    email: "",
    cover: "",
    description: input.description ?? "",
    specialties: [],
    services: [],
    capacity: "",
    hours: "",
    rating: 0,
    reviewsCount: 0,
    doctors: [],
    reviews: [],
    coords: input.coords ?? { lat: 0, lng: 0 },
    equipmentNeeds: [],
    ownerUid: user.uid,
    managerUids: [user.uid],
    source: "user",
    claimStatus: "claimed",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return slug;
}

/** Fields an owner is allowed to edit (publish/verify/rating/reviews excluded). */
export type FacilityOwnerPatch = Partial<
  Pick<
    Facility,
    | "name"
    | "category"
    | "sector"
    | "level"
    | "region"
    | "city"
    | "address"
    | "phone"
    | "email"
    | "cover"
    | "description"
    | "specialties"
    | "services"
    | "capacity"
    | "hours"
    | "doctors"
    | "coords"
  >
>;

/** Facilities owned by a user (their "Mes établissements" list). Single-field query. */
export async function fetchUserFacilities(uid: string): Promise<Facility[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COLLECTION), where("ownerUid", "==", uid)));
  return snap.docs.map((d) => d.data() as Facility);
}

/**
 * Legacy redirect helper: find a facility migrated from an `organizations` doc.
 * Used so old `/structures/:id` health URLs resolve to `/etablissements/:slug`.
 */
export async function fetchFacilityBySourceOrgId(orgId: string): Promise<Facility | null> {
  if (!db || !orgId) return null;
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("sourceOrgId", "==", orgId), limit(1)),
  );
  return snap.empty ? null : (snap.docs[0].data() as Facility);
}

/** Owner read: returns the facility even when unpublished (the owner edits it). */
export async function fetchFacilityForOwner(slug: string): Promise<Facility | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COLLECTION, slug));
  return snap.exists() ? (snap.data() as Facility) : null;
}

/**
 * Owner edit: write content fields and force the facility back into review
 * (published:false, verified:false). Rules reject any attempt to self-publish.
 */
export async function updateFacilityAsOwner(slug: string, patch: FacilityOwnerPatch): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, COLLECTION, slug), {
    ...patch,
    published: false,
    verified: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Admin moderation queue: owner-submitted facilities awaiting validation.
 * Single-field query on `published`; owner-less editorial drafts are filtered out.
 */
export async function fetchPendingFacilities(): Promise<Facility[]> {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("published", "==", false), limit(LIST_LIMIT)),
  );
  return snap.docs.map((d) => d.data() as Facility).filter((f) => !!f.ownerUid);
}

/** Admin: validate an owner-submitted facility → publicly visible + verified. */
export async function publishFacility(slug: string): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, COLLECTION, slug), {
    published: true,
    verified: true,
    updatedAt: serverTimestamp(),
  });
}

/** Admin-only: all imported directory facilities (any publish state), sorted by name. */
export async function fetchDirectoryFacilities(): Promise<Facility[]> {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("source", "==", "imported"), limit(LIST_LIMIT)),
  );
  return snap.docs
    .map((d) => d.data() as Facility)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Admin: show/hide a facility from the public directory. */
export async function setFacilityPublished(slug: string, published: boolean): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, COLLECTION, slug), { published, updatedAt: serverTimestamp() });
}

/** Admin: permanently remove a facility. */
export async function deleteFacility(slug: string): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await deleteDoc(doc(db, COLLECTION, slug));
}

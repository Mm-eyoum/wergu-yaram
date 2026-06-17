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
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Facility } from "@/types/domain";

const COLLECTION = "facilities";
const LIST_LIMIT = 200;

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

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { validateText } from "@/lib/validation";
import type {
  ClaimStatus,
  Coords,
  Organization,
  OrganizationType,
  OrgSource,
  OrgStatus,
} from "@/types/domain";

const COLLECTION = "organizations";
// Bound list reads to cap Firestore cost; add cursor paging if pages outgrow these.
const LIST_LIMIT = 200;
const MAP_LIMIT = 500;

interface CreateOrgInput {
  type: OrganizationType;
  name: string;
  region?: string;
  description?: string;
  address?: string;
  city?: string;
  coords?: Coords | null;
}

/** Shape a Firestore snapshot into a typed Organization. */
function toOrganization(id: string, data: Record<string, unknown>): Organization {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    id,
    type: data.type as OrganizationType,
    name: (data.name as string) ?? "",
    ownerUid: (data.ownerUid as string) ?? "",
    managerUids: (data.managerUids as string[]) ?? [],
    status: (data.status as OrgStatus) ?? "pending",
    region: data.region as string | undefined,
    description: data.description as string | undefined,
    logo: (data.logo as string | null) ?? null,
    profile: data.profile as Record<string, unknown> | undefined,
    createdAt: createdAt?.toDate?.().toISOString(),
    address: data.address as string | undefined,
    city: data.city as string | undefined,
    coords: (data.coords as Coords | undefined) ?? undefined,
    source: (data.source as OrgSource | undefined) ?? "user",
    placeId: data.placeId as string | undefined,
    claimStatus: data.claimStatus as ClaimStatus | undefined,
    phone: data.phone as string | undefined,
    hours: data.hours as string | undefined,
    rating: data.rating as number | undefined,
    photoUrl: (data.photoUrl as string | null) ?? null,
  };
}

/**
 * Create a "page" owned by the current user. Always starts `pending` — only an
 * admin can validate it (enforced by Firestore rules).
 * @returns the new document id.
 */
export async function createOrganization(user: User, input: CreateOrgInput): Promise<string> {
  if (!db) throw new Error("Firebase non configuré.");
  const name = validateText("organizationName", input.name, "Le nom de la page");
  const ref = await addDoc(collection(db, COLLECTION), {
    type: input.type,
    name,
    ownerUid: user.uid,
    managerUids: [user.uid],
    status: "pending" satisfies OrgStatus,
    region: input.region ?? "",
    description: input.description ?? "",
    logo: null,
    address: input.address ?? "",
    city: input.city ?? "",
    coords: input.coords ?? null,
    source: "user" satisfies OrgSource,
    claimStatus: "claimed" satisfies ClaimStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Pages owned by a user (their "Mes pages" list). */
export async function fetchUserOrganizations(uid: string): Promise<Organization[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTION),
    where("ownerUid", "==", uid),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toOrganization(d.id, d.data()));
}

/** Live subscription to a user's pages. Returns the unsubscribe fn. */
export function subscribeUserOrganizations(
  uid: string,
  onData: (orgs: Organization[]) => void,
  onError?: (err: Error) => void,
): () => void {
  if (!db) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, COLLECTION),
    where("ownerUid", "==", uid),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toOrganization(d.id, d.data()))),
    (err) => onError?.(err),
  );
}

export async function fetchOrganization(id: string): Promise<Organization | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? toOrganization(snap.id, snap.data()) : null;
}

/** Public listing: only validated (active) pages of a given type. */
export async function fetchActiveOrganizationsByType(
  type: OrganizationType,
): Promise<Organization[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTION),
    where("type", "==", type),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(LIST_LIMIT),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toOrganization(d.id, d.data()));
}

/** Admin moderation queue: pages awaiting validation. */
export async function fetchPendingOrganizations(): Promise<Organization[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(LIST_LIMIT),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toOrganization(d.id, d.data()));
}

/** Owner/manager profile edit (cannot change status — rules enforce this). */
export async function updateOrganizationProfile(
  id: string,
  patch: Partial<
    Pick<
      Organization,
      "name" | "region" | "description" | "logo" | "profile" | "address" | "city" | "coords" | "phone" | "hours"
    >
  >,
): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, COLLECTION, id), { ...patch, updatedAt: serverTimestamp() });
}

/** All active healthcare-facility pages that carry coordinates (for the map). */
export async function fetchActiveFacilityOrganizations(): Promise<Organization[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTION),
    where("type", "==", "healthcare_facility"),
    where("status", "==", "active"),
    limit(MAP_LIMIT),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toOrganization(d.id, d.data())).filter((o) => !!o.coords);
}

/**
 * All active organization "pages" (any type), for merging into public listings
 * and search. Single-field filter (status) → no composite index required;
 * callers partition by `type` client-side.
 */
export async function fetchActiveOrganizations(): Promise<Organization[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), where("status", "==", "active"), limit(MAP_LIMIT));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toOrganization(d.id, d.data()));
}

/** Admin-only: validate / suspend / reactivate a page. */
export async function setOrganizationStatus(id: string, status: OrgStatus): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, COLLECTION, id), { status, updatedAt: serverTimestamp() });
}

/**
 * Admin-only: all directory listings imported from Google Places, regardless of
 * status (active/suspended). Single-field filter (source) → no composite index;
 * sorted client-side by name since the set is bounded by LIST_LIMIT.
 */
export async function fetchDirectoryOrganizations(): Promise<Organization[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), where("source", "==", "imported"), limit(LIST_LIMIT));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => toOrganization(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Admin-only: permanently remove an organization (rules restrict to admins/owner). */
export async function deleteOrganization(id: string): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await deleteDoc(doc(db, COLLECTION, id));
}

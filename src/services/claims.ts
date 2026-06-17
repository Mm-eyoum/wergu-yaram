/**
 * Directory claim flow. A patient requests ownership of an imported (unclaimed)
 * page; an admin approves → the requester becomes the page's owner/manager.
 *
 * Security: clients only ever create a claim request for themselves. Setting the
 * page owner / claimStatus happens on approval and is admin-gated by rules.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { fetchOrganization } from "./organizations";
import { logAudit } from "./audit";
import { slugify } from "@/lib/slug";
import { validateText } from "@/lib/validation";
import type { ClaimRequest, ClaimRequestStatus, Facility } from "@/types/domain";

const COLLECTION = "claimRequests";
const ORGS = "organizations";
const FACILITIES = "facilities";

/** A facilities slug not already taken (suffixes -2, -3… on collision). */
async function uniqueFacilitySlug(name: string): Promise<string> {
  const base = slugify(name) || "etablissement";
  let candidate = base;
  for (let n = 2; n <= 50; n++) {
    const snap = await getDoc(doc(db!, FACILITIES, candidate));
    if (!snap.exists()) return candidate;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

function toClaim(id: string, data: Record<string, unknown>): ClaimRequest {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    id,
    orgId: (data.orgId as string) ?? "",
    orgName: (data.orgName as string) ?? "",
    requesterUid: (data.requesterUid as string) ?? "",
    requesterName: (data.requesterName as string) ?? "",
    justification: (data.justification as string) ?? "",
    status: (data.status as ClaimRequestStatus) ?? "pending",
    createdAt: createdAt?.toDate?.().toISOString(),
  };
}

/** A signed-in user requests to manage an imported page. */
export async function requestClaim(input: {
  orgId: string;
  orgName: string;
  requesterUid: string;
  requesterName: string;
  justification: string;
}): Promise<string> {
  if (!db) throw new Error("Firebase non configuré.");
  const justification = validateText("claimJustification", input.justification, "La justification");
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    justification,
    status: "pending" satisfies ClaimRequestStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Claims submitted by a given user (for their dashboard). */
export async function fetchUserClaims(uid: string): Promise<ClaimRequest[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), where("requesterUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toClaim(d.id, d.data()));
}

/** Admin moderation queue. */
export async function fetchPendingClaims(): Promise<ClaimRequest[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toClaim(d.id, d.data()));
}

/**
 * Admin: approve a claim → migrate the imported directory listing into a
 * `facilities` entry owned by the requester, then remove the `organizations`
 * doc so there is no duplicate. The new facility starts unpublished/unverified
 * — the owner completes it and an admin validates it before it goes public.
 */
export async function approveClaim(claim: ClaimRequest): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  const org = await fetchOrganization(claim.orgId);
  if (!org) throw new Error("Établissement introuvable (déjà migré ?).");

  const slug = await uniqueFacilitySlug(org.name);
  const facility: Facility = {
    slug,
    published: false,
    verified: false,
    name: org.name,
    type: "",
    region: org.region ?? "",
    city: org.city ?? "",
    address: org.address ?? "",
    phone: org.phone ?? "",
    email: "",
    cover: org.photoUrl ?? "",
    description: org.description ?? "",
    specialties: [],
    services: [],
    capacity: "",
    hours: org.hours ?? "",
    rating: org.rating ?? 0,
    reviewsCount: 0,
    doctors: [],
    reviews: [],
    coords: org.coords ?? { lat: 0, lng: 0 },
    equipmentNeeds: [],
    ownerUid: claim.requesterUid,
    managerUids: [claim.requesterUid],
    sourceOrgId: org.id,
    // Optional fields omitted when absent — Firestore rejects undefined values.
    ...(org.category ? { category: org.category } : {}),
    ...(org.sector ? { sector: org.sector } : {}),
    ...(org.placeId ? { placeId: org.placeId } : {}),
  };

  await setDoc(doc(db, FACILITIES, slug), { ...facility, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await deleteDoc(doc(db, ORGS, claim.orgId));
  await updateDoc(doc(db, COLLECTION, claim.id), { status: "approved", facilitySlug: slug });

  void logAudit({
    action: "approve",
    resourceType: "facility",
    resourceId: slug,
    resourceTitle: org.name,
  });
}

/** Admin: reject a claim → page stays unclaimed. */
export async function rejectClaim(claim: ClaimRequest): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, COLLECTION, claim.id), { status: "rejected" });
}

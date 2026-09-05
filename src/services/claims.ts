/**
 * Directory claim flow. A patient requests ownership of an imported (unclaimed)
 * health establishment (`facilities` doc, source:"imported"); an admin approves
 * → the requester becomes the facility's owner/manager.
 *
 * Security: clients only ever create a claim request for themselves. Setting the
 * facility owner / claimStatus happens on approval and is admin-gated by rules.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@/services/db";
import { db } from "./firebase";
import { logAudit } from "./audit";
import { validateText } from "@/lib/validation";
import type { ClaimRequest, ClaimRequestStatus } from "@/types/domain";

const COLLECTION = "claimRequests";
const FACILITIES = "facilities";

function toClaim(id: string, data: Record<string, unknown>): ClaimRequest {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  const facilitySlug = (data.facilitySlug as string) ?? (data.orgId as string) ?? "";
  const facilityName = (data.facilityName as string) ?? (data.orgName as string) ?? "";
  return {
    id,
    facilitySlug,
    facilityName,
    // Legacy fields kept so older docs and existing UI keep working.
    orgId: (data.orgId as string) ?? facilitySlug,
    orgName: (data.orgName as string) ?? facilityName,
    requesterUid: (data.requesterUid as string) ?? "",
    requesterName: (data.requesterName as string) ?? "",
    justification: (data.justification as string) ?? "",
    status: (data.status as ClaimRequestStatus) ?? "pending",
    createdAt: createdAt?.toDate?.().toISOString(),
  };
}

/** A signed-in user requests to manage an imported establishment. */
export async function requestClaim(input: {
  facilitySlug: string;
  facilityName: string;
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
 * Admin: approve a claim → attribute the imported establishment to the requester.
 * No collection migration anymore (the establishment already lives in
 * `facilities`): we simply set its owner/managers and mark it claimed.
 */
export async function approveClaim(claim: ClaimRequest): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  const slug = claim.facilitySlug || claim.orgId;
  if (!slug) throw new Error("Réclamation invalide (établissement manquant).");
  const snap = await getDoc(doc(db, FACILITIES, slug));
  if (!snap.exists()) throw new Error("Établissement introuvable (déjà réclamé ?).");

  await updateDoc(doc(db, FACILITIES, slug), {
    ownerUid: claim.requesterUid,
    managerUids: [claim.requesterUid],
    claimStatus: "claimed",
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, COLLECTION, claim.id), { status: "approved", facilitySlug: slug });

  void logAudit({
    action: "approve",
    resourceType: "facility",
    resourceId: slug,
    resourceTitle: claim.facilityName || claim.orgName || slug,
  });
}

/** Admin: reject a claim → establishment stays unclaimed. */
export async function rejectClaim(claim: ClaimRequest): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, COLLECTION, claim.id), { status: "rejected" });
}

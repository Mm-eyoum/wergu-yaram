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
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { validateText } from "@/lib/validation";
import type { ClaimRequest, ClaimRequestStatus } from "@/types/domain";

const COLLECTION = "claimRequests";
const ORGS = "organizations";

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

/** Admin: approve a claim → transfer ownership of the page to the requester. */
export async function approveClaim(claim: ClaimRequest): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, ORGS, claim.orgId), {
    ownerUid: claim.requesterUid,
    managerUids: [claim.requesterUid],
    claimStatus: "claimed",
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, COLLECTION, claim.id), { status: "approved" });
}

/** Admin: reject a claim → page stays unclaimed. */
export async function rejectClaim(claim: ClaimRequest): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, COLLECTION, claim.id), { status: "rejected" });
}

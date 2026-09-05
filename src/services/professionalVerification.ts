/**
 * Flux de vérification « professionnel de santé ». Un utilisateur soumet une
 * demande (justificatif d'ordre/diplôme) ; un admin l'approuve → son rôle passe
 * à `health_pro` (badge « Professionnel vérifié »), sans aucun pouvoir admin.
 *
 * Calqué sur le flux des réclamations (services/claims.ts) : le client ne crée
 * qu'une demande pour lui-même ; la décision est admin-gated par les règles.
 */
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  where,
} from "@/services/db";
import { db } from "./firebase";
import { setUserRole } from "./users";
import { logAudit } from "./audit";
import { validateText } from "@/lib/validation";
import type {
  ProfessionalVerificationRequest,
  ProfessionalVerificationStatus,
} from "@/types/domain";

const COLLECTION = "professionalVerificationRequests";

function toRequest(id: string, data: Record<string, unknown>): ProfessionalVerificationRequest {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    id,
    requesterUid: (data.requesterUid as string) ?? "",
    requesterName: (data.requesterName as string) ?? "",
    requesterEmail: (data.requesterEmail as string) ?? "",
    justification: (data.justification as string) ?? "",
    licenseNumber: data.licenseNumber as string | undefined,
    specialties: (data.specialties as string[] | undefined) ?? undefined,
    status: (data.status as ProfessionalVerificationStatus) ?? "pending",
    createdAt: createdAt?.toDate?.().toISOString(),
  };
}

/** A signed-in active user requests the verified health-professional badge. */
export async function requestProfessionalVerification(input: {
  requesterUid: string;
  requesterName: string;
  requesterEmail: string;
  justification: string;
  licenseNumber?: string;
  specialties?: string[];
}): Promise<string> {
  if (!db) throw new Error("Firebase non configuré.");
  const justification = validateText("verificationJustification", input.justification, "La justification");
  const ref = await addDoc(collection(db, COLLECTION), {
    requesterUid: input.requesterUid,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    justification,
    ...(input.licenseNumber ? { licenseNumber: input.licenseNumber } : {}),
    ...(input.specialties?.length ? { specialties: input.specialties } : {}),
    status: "pending" satisfies ProfessionalVerificationStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Requests submitted by a given user (to show their pending/approved state). */
export async function fetchUserVerificationRequests(
  uid: string,
): Promise<ProfessionalVerificationRequest[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), where("requesterUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toRequest(d.id, d.data()));
}

/** Admin moderation queue (pending requests). */
export async function fetchPendingVerificationRequests(): Promise<ProfessionalVerificationRequest[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toRequest(d.id, d.data()));
}

/** Admin: approve → grant the `health_pro` role, then mark the request approved. */
export async function approveVerificationRequest(
  req: ProfessionalVerificationRequest,
): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await setUserRole(req.requesterUid, "health_pro");
  await updateDoc(doc(db, COLLECTION, req.id), { status: "approved", decidedAt: serverTimestamp() });
  void logAudit({
    action: "approve",
    resourceType: "professionalVerification",
    resourceId: req.id,
    resourceTitle: req.requesterName,
  });
}

/** Admin: reject the request (role unchanged). */
export async function rejectVerificationRequest(
  req: ProfessionalVerificationRequest,
): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, COLLECTION, req.id), { status: "rejected", decidedAt: serverTimestamp() });
  void logAudit({
    action: "reject",
    resourceType: "professionalVerification",
    resourceId: req.id,
    resourceTitle: req.requesterName,
  });
}

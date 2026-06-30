/**
 * Adhésions à un espace partenaire (mutuelles, associations). MVP : inscription
 * (adhésion) + suivi de cotisation/statut. Le paiement récurrent réutilise le
 * rail Bictorys (à activer). Lecture/gestion par le manager du tenant.
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Membership, MembershipStatus } from "@/types/domain";

export interface MembershipInput {
  tenantSlug: string;
  name: string;
  email: string;
  phone?: string;
  uid?: string;
}

export async function joinTenant(input: MembershipInput): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await addDoc(collection(db, "memberships"), {
    tenantSlug: input.tenantSlug,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() ?? "",
    uid: input.uid ?? "",
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function fetchTenantMembers(tenantSlug: string, max = 500): Promise<Membership[]> {
  if (!db || !tenantSlug) return [];
  const snap = await getDocs(
    query(collection(db, "memberships"), where("tenantSlug", "==", tenantSlug), limit(max)),
  );
  return snap.docs
    .map((d) => {
      const data = d.data();
      const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
      return {
        id: d.id,
        tenantSlug: data.tenantSlug as string,
        uid: data.uid as string | undefined,
        name: (data.name as string) ?? "",
        email: (data.email as string) ?? "",
        phone: data.phone as string | undefined,
        status: (data.status as MembershipStatus) ?? "pending",
        amount: data.amount as number | undefined,
        paidUntil: data.paidUntil as string | undefined,
        createdAt: createdAt?.toDate?.().toISOString(),
      } satisfies Membership;
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function setMemberStatus(id: string, status: MembershipStatus): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, "memberships", id), { status, updatedAt: serverTimestamp() });
}

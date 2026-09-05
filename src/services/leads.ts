/**
 * Lead capture for partner spaces. Visitors submit a contact / demo / application
 * request from a partner's space → `leads` collection; the tenant manager (and
 * admins) read their own leads. Writes are open-but-validated by the rules.
 */
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from "@/services/db";
import { apiPost } from "./apiClient";
import { usesD1 } from "./dbRouting";
import { db } from "./firebase";
import type { Lead, LeadKind } from "@/types/domain";

export interface LeadInput {
  tenantSlug: string;
  kind: LeadKind;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

export async function submitLead(input: LeadInput): Promise<void> {
  if (usesD1("leads")) {
    await apiPost("/api/v1/forms/lead", input);
    return;
  }
  if (!db) throw new Error("Firebase non configuré.");
  await addDoc(collection(db, "leads"), {
    tenantSlug: input.tenantSlug,
    kind: input.kind,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() ?? "",
    message: input.message?.trim() ?? "",
    status: "new",
    createdAt: serverTimestamp(),
  });
}

/** Leads received by one partner space (manager view). Sorted newest-first. */
export async function fetchTenantLeads(tenantSlug: string, max = 200): Promise<Lead[]> {
  if (!db || !tenantSlug) return [];
  const snap = await getDocs(
    query(collection(db, "leads"), where("tenantSlug", "==", tenantSlug), limit(max)),
  );
  return snap.docs
    .map((d) => {
      const data = d.data();
      const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
      return {
        id: d.id,
        tenantSlug: data.tenantSlug as string,
        kind: (data.kind as LeadKind) ?? "contact",
        name: (data.name as string) ?? "",
        email: (data.email as string) ?? "",
        phone: data.phone as string | undefined,
        message: data.message as string | undefined,
        status: (data.status as Lead["status"]) ?? "new",
        createdAt: createdAt?.toDate?.().toISOString(),
      } satisfies Lead;
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

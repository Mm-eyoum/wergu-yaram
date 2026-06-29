/**
 * Partner-facing tenant service. A tenant owner/manager edits their space's
 * profile & branding (NOT ownerUid/managerUids/campaignQuota — locked by the
 * Firestore rules). Reads return the doc even when unpublished (managers edit
 * drafts), unlike the public `getTenantBySlug` in catalog.ts.
 */
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Tenant } from "@/types/domain";

/** Editable subset for a tenant manager (mirrors the rules' allowed fields). */
export type TenantManagerPatch = Partial<
  Pick<
    Tenant,
    "name" | "description" | "logo" | "theme" | "website" | "domain" | "published"
  >
>;

export async function fetchTenantForManager(slug: string): Promise<Tenant | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "tenants", slug));
  return snap.exists() ? (snap.data() as Tenant) : null;
}

/** True if a tenant doc already owns this slug (= sub-domain collision check). */
export async function tenantSlugExists(slug: string): Promise<boolean> {
  if (!db) return false;
  const snap = await getDoc(doc(db, "tenants", slug));
  return snap.exists();
}

export async function updateTenantAsManager(slug: string, patch: TenantManagerPatch): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, "tenants", slug), { ...patch, updatedAt: serverTimestamp() });
}

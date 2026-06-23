/**
 * Campagnes de prévention ciblées (SMS/WhatsApp) — côté client (admin).
 *
 * Le ciblage + l'envoi se font côté serveur (Cloud Function `sendCampaign`,
 * qui résout l'audience consentante et dispatche via Chatwoot). Le client ne
 * fait que composer/lancer et lire l'historique.
 */
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import type { Campaign, CampaignChannel } from "@/types/domain";

export interface CampaignInput {
  title: string;
  channel: CampaignChannel;
  message: string;
  segment: { interest?: string; region?: string; communitySlug?: string };
  /** When set, a tenant manager sends a campaign scoped to their space (quota-capped). */
  tenantSlug?: string;
}

function toCampaign(id: string, data: Record<string, unknown>): Campaign {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    id,
    title: (data.title as string) ?? "",
    channel: (data.channel as CampaignChannel) ?? "sms",
    message: (data.message as string) ?? "",
    segment: (data.segment as Campaign["segment"]) ?? {},
    status: (data.status as Campaign["status"]) ?? "sent",
    targetedCount: (data.targetedCount as number) ?? 0,
    sentCount: (data.sentCount as number) ?? 0,
    createdByUid: data.createdByUid as string | undefined,
    createdAt: createdAt?.toDate?.().toISOString(),
    tenantSlug: (data.tenantSlug as string | undefined) ?? undefined,
  };
}

/** Campaigns for one partner space (manager view). Sorted client-side (no index). */
export async function fetchTenantCampaigns(tenantSlug: string, max = 100): Promise<Campaign[]> {
  if (!db || !tenantSlug) return [];
  const snap = await getDocs(
    query(collection(db, "campaigns"), where("tenantSlug", "==", tenantSlug), limit(max)),
  );
  return snap.docs
    .map((d) => toCampaign(d.id, d.data()))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/** Launch a campaign (server resolves audience + dispatches). Returns counts. */
export async function startCampaign(
  input: CampaignInput,
): Promise<{ campaignId: string; targeted: number; sent: number }> {
  if (!functions) throw new Error("Backend non configuré.");
  const callable = httpsCallable<CampaignInput, { campaignId: string; targeted: number; sent: number }>(
    functions,
    "sendCampaign",
  );
  const { data } = await callable(input);
  return data;
}

/** Past campaigns (admin dashboard). */
export async function fetchCampaigns(max = 100): Promise<Campaign[]> {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, "campaigns"), orderBy("createdAt", "desc"), limit(max)),
  );
  return snap.docs.map((d) => toCampaign(d.id, d.data()));
}

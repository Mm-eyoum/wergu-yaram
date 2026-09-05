/**
 * Campagnes de prévention ciblées (SMS/WhatsApp) — côté client (admin).
 *
 * Le ciblage + l'envoi se font côté serveur (Cloud Function `sendCampaign`,
 * qui résout l'audience consentante et dispatche via Chatwoot). Le client ne
 * fait que composer/lancer et lire l'historique.
 */
import { collection, getDocs, limit, orderBy, query, where } from "@/services/db";
import { httpsCallable } from "firebase/functions";
import { apiPost } from "./apiClient";
import { usesD1 } from "./dbRouting";
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
  if (usesD1("campaigns")) {
    // ⚠️ SEUL changement de contrat des fonctions portées : le serveur renvoie
    // `queued`, pas `sent`. La diffusion passe désormais par une file — la
    // version Cloud Function enchaînait jusqu'à 1 500 appels Chatwoot
    // séquentiels avec le client bloqué. Le compteur réel (`sentCount`) est
    // incrémenté par le consommateur ; l'UI rafraîchit la ligne de campagne.
    const res = await apiPost<{ campaignId: string; targeted: number; queued: number }>(
      "/api/v1/campaigns",
      input,
    );
    return { campaignId: res.campaignId, targeted: res.targeted, sent: res.queued };
  }

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

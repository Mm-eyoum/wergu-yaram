/**
 * Real per-tenant analytics — aggregated live from Firestore (never invented).
 * Mirrors stats.ts (safe counts) + summarizeTransactions (client aggregation).
 * Page views come from `tenantReports` (rolled up by a scheduled Cloud Function;
 * raw `pageViews` are not client-readable). All figures degrade to 0/null when
 * Firestore is absent rather than showing placeholders.
 */
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
  type Query,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import { reportError } from "@/lib/errorReporting";

/** Real GA4 traffic for a tenant's pages (server-fetched + cached). */
export interface TenantTraffic {
  configured: boolean;
  cached?: boolean;
  views?: number;
  users?: number;
  sessions?: number;
  daily?: { date: string; views: number }[];
}

export async function fetchTenantTraffic(slug: string): Promise<TenantTraffic> {
  if (!functions || !slug) return { configured: false };
  try {
    const callable = httpsCallable<{ tenantSlug: string }, TenantTraffic>(functions, "getTenantTraffic");
    const { data } = await callable({ tenantSlug: slug });
    return data;
  } catch (err) {
    reportError(err, { scope: "tenantAnalytics.fetchTenantTraffic" });
    return { configured: false };
  }
}

export interface TenantAnalytics {
  communities: number;
  members: number; // Σ community.membersCount
  posts: number; // Σ community.postsCount
  events: number;
  articles: number;
  formations: number;
  needs: number;
  raised: number; // Σ equipmentNeed.raisedAmount (XOF)
  target: number; // Σ equipmentNeed.targetAmount (XOF)
  donors: number; // Σ equipmentNeed.donorsCount
  campaigns: number;
  campaignSent: number; // Σ campaign.sentCount
  campaignTargeted: number; // Σ campaign.targetedCount
  views: number; // Σ tenantReports views (internal pageview logging)
}

const EMPTY: TenantAnalytics = {
  communities: 0, members: 0, posts: 0, events: 0, articles: 0, formations: 0,
  needs: 0, raised: 0, target: 0, donors: 0, campaigns: 0, campaignSent: 0,
  campaignTargeted: 0, views: 0,
};

async function safeCount(q: Query): Promise<number> {
  try {
    return (await getCountFromServer(q)).data().count;
  } catch (err) {
    reportError(err, { scope: "tenantAnalytics.safeCount" });
    return 0;
  }
}

/** Fetch a tenant's docs in one collection and sum the given numeric fields. */
async function sumFields(
  collectionName: string,
  slug: string,
  fields: string[],
): Promise<Record<string, number>> {
  const totals: Record<string, number> = Object.fromEntries(fields.map((f) => [f, 0]));
  if (!db) return totals;
  try {
    const snap = await getDocs(query(collection(db, collectionName), where("tenantSlug", "==", slug)));
    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      for (const f of fields) {
        const v = data[f];
        if (typeof v === "number") totals[f] += v;
      }
    }
  } catch (err) {
    reportError(err, { scope: "tenantAnalytics.sumFields", collection: collectionName });
  }
  return totals;
}

export async function getTenantAnalytics(slug: string): Promise<TenantAnalytics> {
  if (!db || !slug) return EMPTY;
  const byTenant = (name: string) => query(collection(db!, name), where("tenantSlug", "==", slug));

  const [
    communities, events, articles, formations, needs, campaigns,
    communitySums, needSums, campaignSums, viewSums,
  ] = await Promise.all([
    safeCount(byTenant("communities")),
    safeCount(byTenant("events")),
    safeCount(byTenant("articles")),
    safeCount(byTenant("formations")),
    safeCount(byTenant("equipmentNeeds")),
    safeCount(byTenant("campaigns")),
    sumFields("communities", slug, ["membersCount", "postsCount"]),
    sumFields("equipmentNeeds", slug, ["raisedAmount", "targetAmount", "donorsCount"]),
    sumFields("campaigns", slug, ["sentCount", "targetedCount"]),
    sumFields("tenantReports", slug, ["views"]),
  ]);

  return {
    communities, events, articles, formations, needs, campaigns,
    members: communitySums.membersCount,
    posts: communitySums.postsCount,
    raised: needSums.raisedAmount,
    target: needSums.targetAmount,
    donors: needSums.donorsCount,
    campaignSent: campaignSums.sentCount,
    campaignTargeted: campaignSums.targetedCount,
    views: viewSums.views,
  };
}

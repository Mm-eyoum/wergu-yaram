/**
 * Monétisation — lecture côté client (scaffold).
 *
 * Plans tarifaires, abonnements et registre des transactions. Les écritures
 * financières se font EXCLUSIVEMENT côté serveur (Cloud Functions, cf.
 * functions/src/index.ts) ; ce module ne fait que lire pour l'UI et le
 * dashboard admin. Tout est en XOF.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import { isPaymentsEnabled, type DonationPaymentType } from "./payments";
import type {
  PricingPlan,
  Subscription,
  Transaction,
} from "@/types/domain";

function isoOf(value: unknown): string | undefined {
  return (value as { toDate?: () => Date } | undefined)?.toDate?.().toISOString();
}

/* --- Plans tarifaires (grille publique) --- */

/** Active pricing plans, optionally filtered by line of business, sorted. */
export async function fetchPricingPlans(
  lineOfBusiness?: PricingPlan["lineOfBusiness"],
): Promise<PricingPlan[]> {
  if (!db) return [];
  const base = collection(db, "pricingPlans");
  const q = lineOfBusiness
    ? query(base, where("isActive", "==", true), where("lineOfBusiness", "==", lineOfBusiness))
    : query(base, where("isActive", "==", true));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<PricingPlan, "id">) }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/* --- Abonnements --- */

export async function fetchUserSubscriptions(uid: string): Promise<Subscription[]> {
  if (!db) return [];
  const q = query(
    collection(db, "subscriptions"),
    where("subscriberUid", "==", uid),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subscription, "id">) }));
}

/** A page's subscription (doc id = orgId — one active sub per page). */
export async function fetchOrgSubscription(orgId: string): Promise<Subscription | null> {
  if (!db || !orgId) return null;
  const snap = await getDoc(doc(db, "subscriptions", orgId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Subscription, "id">) }) : null;
}

/**
 * Start a page-subscription checkout (Vérifié/Pro). Calls the Cloud Function
 * (which fixes the amount server-side) and redirects to Bictorys. Throws when
 * payments are disabled — callers should fall back to a "coming soon" message.
 */
export async function startPlanCheckout(input: {
  planId: string;
  orgId: string;
  paymentType?: DonationPaymentType;
}): Promise<void> {
  if (!isPaymentsEnabled || !functions) throw new Error("Paiement non activé.");
  const callable = httpsCallable<typeof input, { checkoutUrl: string; pendingId: string }>(
    functions,
    "createPlanCharge",
  );
  const { data } = await callable(input);
  if (!data?.checkoutUrl) throw new Error("URL de paiement indisponible.");
  window.location.href = data.checkoutUrl;
}

/**
 * Start an event-ticket checkout. Calls the Cloud Function (validates seats and
 * price server-side) and redirects to Bictorys.
 */
export async function startTicketCheckout(input: {
  eventId: string;
  quantity: number;
  paymentType?: DonationPaymentType;
}): Promise<void> {
  if (!isPaymentsEnabled || !functions) throw new Error("Paiement non activé.");
  const callable = httpsCallable<typeof input, { checkoutUrl: string; pendingId: string }>(
    functions,
    "createTicketCharge",
  );
  const { data } = await callable(input);
  if (!data?.checkoutUrl) throw new Error("URL de paiement indisponible.");
  window.location.href = data.checkoutUrl;
}

/* --- Transactions (lecture admin pour le dashboard) --- */

function mapTransaction(id: string, d: Record<string, unknown>): Transaction {
  return {
    id,
    type: d.type as Transaction["type"],
    lineOfBusiness: d.lineOfBusiness as Transaction["lineOfBusiness"],
    payerUid: d.payerUid as string | undefined,
    refId: d.refId as string | undefined,
    amount: (d.amount as number) ?? 0,
    currency: "XOF",
    fees: (d.fees as number) ?? 0,
    platformAmount: (d.platformAmount as number) ?? 0,
    netAmount: (d.netAmount as number) ?? 0,
    status: d.status as Transaction["status"],
    paymentMethod: d.paymentMethod as Transaction["paymentMethod"],
    providerTransactionId: d.providerTransactionId as string | undefined,
    metadata: d.metadata as Record<string, unknown> | undefined,
    createdAt: isoOf(d.createdAt) ?? "",
  };
}

/**
 * Monthly Recurring Revenue from active page subscriptions (admin only).
 * Yearly plans are normalized to a monthly equivalent.
 */
export async function fetchMrr(): Promise<{ mrr: number; activeCount: number }> {
  if (!db) return { mrr: 0, activeCount: 0 };
  const [subsSnap, plans] = await Promise.all([
    getDocs(query(collection(db, "subscriptions"), where("status", "==", "active"))),
    fetchPricingPlans("pages"),
  ]);
  const planById = new Map(plans.map((p) => [p.id, p]));
  let mrr = 0;
  subsSnap.forEach((d) => {
    const planId = (d.data() as { planId?: string }).planId;
    const plan = planId ? planById.get(planId) : undefined;
    if (!plan) return;
    mrr += plan.billingPeriod === "yearly" ? plan.price / 12 : plan.price;
  });
  return { mrr: Math.round(mrr), activeCount: subsSnap.size };
}

/**
 * A signed-in user's own donations (line of business "donations"), newest first.
 * Reads `transactions` filtered by `payerUid` (owner-readable by rules) and keeps
 * only the donations line client-side. Powers the "Mes dons & impact" page.
 */
export async function fetchUserDonations(uid: string): Promise<Transaction[]> {
  if (!db || !uid) return [];
  const q = query(
    collection(db, "transactions"),
    where("payerUid", "==", uid),
    orderBy("createdAt", "desc"),
    fbLimit(200),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapTransaction(d.id, d.data()))
    .filter((t) => t.lineOfBusiness === "donations" && t.status === "completed");
}

/** Headline figures for a user's donations. */
export interface DonationSummary {
  /** Total transacted (don + pourboire). */
  total: number;
  /** Total tip kept by the platform. */
  tips: number;
  /** Number of donations. */
  count: number;
  /** Distinct campaigns supported (by refId). */
  campaigns: number;
}

export function summarizeDonations(txns: Transaction[]): DonationSummary {
  const campaigns = new Set<string>();
  let total = 0;
  let tips = 0;
  for (const t of txns) {
    total += t.amount;
    tips += t.platformAmount;
    if (t.refId) campaigns.add(t.refId);
  }
  return { total, tips, count: txns.length, campaigns: campaigns.size };
}

/** Most-recent completed transactions (admin dashboard source). */
export async function fetchRecentTransactions(max = 500): Promise<Transaction[]> {
  if (!db) return [];
  const q = query(
    collection(db, "transactions"),
    orderBy("createdAt", "desc"),
    fbLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapTransaction(d.id, d.data()));
}

/** Aggregated revenue figures computed client-side from raw transactions. */
export interface RevenueSummary {
  /** Gross merchandise volume — total amount transacted. */
  gmv: number;
  /** Net revenue kept by the platform (tips + commissions). */
  platformRevenue: number;
  /** Aggregator fees. */
  fees: number;
  transactionsCount: number;
  /** Platform revenue ÷ GMV (the effective "take rate"). */
  takeRate: number;
  byLine: Record<string, { gmv: number; platformRevenue: number; count: number }>;
}

/** Summarize completed transactions into headline figures for the dashboard. */
export function summarizeTransactions(txns: Transaction[]): RevenueSummary {
  const completed = txns.filter((t) => t.status === "completed");
  const summary: RevenueSummary = {
    gmv: 0,
    platformRevenue: 0,
    fees: 0,
    transactionsCount: completed.length,
    takeRate: 0,
    byLine: {},
  };
  for (const t of completed) {
    summary.gmv += t.amount;
    summary.platformRevenue += t.platformAmount;
    summary.fees += t.fees;
    const line = (summary.byLine[t.lineOfBusiness] ??= {
      gmv: 0,
      platformRevenue: 0,
      count: 0,
    });
    line.gmv += t.amount;
    line.platformRevenue += t.platformAmount;
    line.count += 1;
  }
  summary.takeRate = summary.gmv > 0 ? summary.platformRevenue / summary.gmv : 0;
  return summary;
}

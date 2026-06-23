/**
 * Cloud Functions — paiement des dons via Bictorys.
 *
 * Pourquoi un serveur ? La clé SECRÈTE Bictorys ne doit jamais être exposée au
 * navigateur, et le montant doit être figé côté serveur (anti-fraude). Le client
 * appelle `createBictorysCharge` (callable), reçoit l'URL de checkout hébergé et
 * y redirige l'utilisateur. Bictorys notifie ensuite `bictorysWebhook` qui
 * crédite la collecte du besoin d'équipement.
 *
 * Réf. API : POST {BICTORYS_API_URL}/pay/v1/charges, en-tête `X-Api-Key`.
 * ⚠️ Vérifier le nom exact des champs de réponse/événement dans la doc Bictorys
 * (https://docs.bictorys.com) — les accès défensifs ci-dessous couvrent les
 * variantes courantes.
 */
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret, defineString } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

initializeApp();
const db = getFirestore();

const PLACES_API_KEY = defineSecret("PLACES_API_KEY");
const BICTORYS_API_KEY = defineSecret("BICTORYS_API_KEY");
const BICTORYS_WEBHOOK_SECRET = defineSecret("BICTORYS_WEBHOOK_SECRET");
const BICTORYS_API_URL = defineString("BICTORYS_API_URL", { default: "https://api.bictorys.com" });
const APP_PUBLIC_URL = defineString("APP_PUBLIC_URL", { default: "https://werguyaram.org" });

// --- Chatwoot (support omnicanal, auto-hébergé) + Brevo (email transactionnel) ---
// Secrets (Secret Manager) :
//   CHATWOOT_HMAC_TOKEN   — signe l'identité du widget web (identité vérifiée).
//   CHATWOOT_API_TOKEN    — Access Token agent/bot pour l'API REST (push contacts).
//   CHATWOOT_WEBHOOK_TOKEN— jeton partagé protégeant `chatwootWebhook` (Chatwoot ne signe pas).
//   BREVO_API_KEY         — envoi d'emails transactionnels.
// Params non secrets (functions/.env) : URL/identifiants d'instance + expéditeur.
const CHATWOOT_HMAC_TOKEN = defineSecret("CHATWOOT_HMAC_TOKEN");
const CHATWOOT_API_TOKEN = defineSecret("CHATWOOT_API_TOKEN");
const CHATWOOT_WEBHOOK_TOKEN = defineSecret("CHATWOOT_WEBHOOK_TOKEN");
const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const CHATWOOT_BASE_URL = defineString("CHATWOOT_BASE_URL", { default: "" });
const CHATWOOT_ACCOUNT_ID = defineString("CHATWOOT_ACCOUNT_ID", { default: "" });
const CHATWOOT_WEBSITE_INBOX_ID = defineString("CHATWOOT_WEBSITE_INBOX_ID", { default: "" });
const BREVO_SENDER = defineString("BREVO_SENDER", { default: "Wergu Yaram <no-reply@werguyaram.org>" });

const MIN_AMOUNT = 500; // XOF
const MAX_AMOUNT = 5_000_000; // XOF — sanity ceiling for a single donation.
const MAX_TIP = 1_000_000; // XOF — sanity ceiling for the optional platform tip.

// Estimated mobile-money aggregator fee rate, used to record `fees` on each
// transaction for reporting. Reconcile against Bictorys settlement reports.
const FEE_RATE = 0.012;

// Per-user rate limit on charge creation: bounds abuse (spamming Bictorys /
// flooding `donations`) without blocking a genuine repeat donor.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 20;

// Restrict callable functions to the app's own origins (defense in depth on top
// of the per-call auth token). Set CORS_ORIGINS (comma-separated) to override
// for staging/preview hosts; localhost is allowed ONLY under the emulator so it
// never widens the allow-list in production.
const CORS_ORIGINS: (string | RegExp)[] = (
  process.env.CORS_ORIGINS ?? "https://werguyaram.org,https://werguyaram.web.app"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
if (process.env.FUNCTIONS_EMULATOR === "true") {
  CORS_ORIGINS.push(/^http:\/\/localhost(:\d+)?$/);
}

type PaymentType = "wave" | "orange_money" | "mtn_money" | "card";

/** Create a Bictorys charge and return its hosted-checkout URL. */
export const createBictorysCharge = onCall(
  { secrets: [BICTORYS_API_KEY], cors: CORS_ORIGINS },
  async (request) => {
    const { needId, amount, paymentType, tipAmount } = (request.data ?? {}) as {
      needId?: string;
      amount?: number;
      paymentType?: PaymentType;
      tipAmount?: number;
    };

    if (
      !needId ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount < MIN_AMOUNT ||
      amount > MAX_AMOUNT
    ) {
      throw new HttpsError(
        "invalid-argument",
        "needId et un montant valide (entre 500 et 5 000 000 XOF) sont requis.",
      );
    }

    // Optional platform tip ("Soutenir aussi Wergu Yaram"). The need is credited
    // with `amount`; the tip is platform revenue. The total charge = amount + tip.
    const tip =
      typeof tipAmount === "number" && Number.isFinite(tipAmount) && tipAmount > 0
        ? Math.min(Math.round(tipAmount), MAX_TIP)
        : 0;
    const total = amount + tip;

    // Rate limit per authenticated donor (rolling window). Guests (no uid) are
    // bounded by the hosted-checkout / Bictorys side; we can't key them safely.
    const uid = request.auth?.uid;
    if (uid) {
      const since = Timestamp.fromMillis(Date.now() - RATE_WINDOW_MS);
      const recent = await db
        .collection("donations")
        .where("donorUid", "==", uid)
        .where("createdAt", ">=", since)
        .count()
        .get();
      if (recent.data().count >= RATE_MAX) {
        throw new HttpsError(
          "resource-exhausted",
          "Trop de tentatives de don récentes. Réessayez dans un moment.",
        );
      }
    }

    // Server-side source of truth: the need must exist (and prevents arbitrary refs).
    const needSnap = await db.collection("equipmentNeeds").doc(needId).get();
    if (!needSnap.exists) throw new HttpsError("not-found", "Besoin introuvable.");
    const need = needSnap.data() as { title?: string };

    // Record a pending donation we can reconcile from the webhook.
    const donationRef = await db.collection("donations").add({
      needId,
      amount,
      tipAmount: tip,
      currency: "XOF",
      status: "pending",
      paymentType: paymentType ?? null,
      donorUid: request.auth?.uid ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    const body: Record<string, unknown> = {
      amount: total,
      currency: "XOF",
      country: "SN",
      successRedirectUrl: `${APP_PUBLIC_URL.value()}/besoins/${needId}?don=succes`,
      ErrorRedirectUrl: `${APP_PUBLIC_URL.value()}/besoins/${needId}?don=echec`,
      // merchantReference lets the webhook map back to our donation doc.
      merchantReference: donationRef.id,
      description: `Don — ${need.title ?? needId}`,
    };
    // Omitting payment_type → Bictorys hosted checkout (all methods).
    if (paymentType) body.payment_type = paymentType;

    const res = await fetch(`${BICTORYS_API_URL.value()}/pay/v1/charges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": BICTORYS_API_KEY.value(),
        "Request-Id": donationRef.id,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      await donationRef.update({ status: "failed" });
      throw new HttpsError("internal", `Bictorys a renvoyé ${res.status}.`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    // Confirm the exact field name against Bictorys docs.
    const checkoutUrl =
      (data.checkoutUrl as string) ??
      (data.checkout_url as string) ??
      (data.link as string) ??
      (data.paymentLink as string);
    const transactionId = (data.id as string) ?? (data.transactionId as string) ?? null;

    await donationRef.update({ transactionId, checkoutUrl: checkoutUrl ?? null });

    if (!checkoutUrl) throw new HttpsError("internal", "URL de paiement absente de la réponse Bictorys.");
    return { checkoutUrl, donationId: donationRef.id };
  },
);

// ---------------------------------------------------------------------------
// Charge helper + abonnements de pages (Ligne 2)
// ---------------------------------------------------------------------------
// `postBictorysCharge` factorise l'appel hosted-checkout, réutilisé par les
// flux abonnement / billet. Les dons gardent leur fonction dédiée ci-dessus.

/** POST a charge to Bictorys and return its hosted-checkout URL + provider id. */
async function postBictorysCharge(params: {
  amount: number;
  merchantReference: string;
  description: string;
  paymentType?: PaymentType;
  /** App path to return to; `?paiement=succes|echec` is appended. */
  redirectPath: string;
}): Promise<{ checkoutUrl: string; providerTransactionId: string | null }> {
  const baseUrl = APP_PUBLIC_URL.value();
  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: "XOF",
    country: "SN",
    successRedirectUrl: `${baseUrl}${params.redirectPath}?paiement=succes`,
    ErrorRedirectUrl: `${baseUrl}${params.redirectPath}?paiement=echec`,
    merchantReference: params.merchantReference,
    description: params.description,
  };
  if (params.paymentType) body.payment_type = params.paymentType;

  const res = await fetch(`${BICTORYS_API_URL.value()}/pay/v1/charges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": BICTORYS_API_KEY.value(),
      "Request-Id": params.merchantReference,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HttpsError("internal", `Bictorys a renvoyé ${res.status}.`);
  const data = (await res.json()) as Record<string, unknown>;
  const checkoutUrl =
    (data.checkoutUrl as string) ??
    (data.checkout_url as string) ??
    (data.link as string) ??
    (data.paymentLink as string);
  const providerTransactionId = (data.id as string) ?? (data.transactionId as string) ?? null;
  if (!checkoutUrl) throw new HttpsError("internal", "URL de paiement absente de la réponse Bictorys.");
  return { checkoutUrl, providerTransactionId };
}

/**
 * Create a charge to subscribe a page (Organization) to a Vérifié/Pro plan.
 * Pay-per-period (no auto-debit). The webhook activates the subscription and
 * sets the page entitlement on success.
 */
export const createPlanCharge = onCall(
  { secrets: [BICTORYS_API_KEY], cors: CORS_ORIGINS },
  async (request) => {
    const { planId, orgId, facilitySlug, paymentType } = (request.data ?? {}) as {
      planId?: string;
      orgId?: string;
      facilitySlug?: string;
      paymentType?: PaymentType;
    };
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Connexion requise.");
    if (!planId || (!orgId && !facilitySlug)) {
      throw new HttpsError("invalid-argument", "planId et orgId ou facilitySlug requis.");
    }

    // Target = a partner page (organizations/orgId) OR a health establishment
    // (facilities/facilitySlug). The subscription/entitlement is written back to
    // whichever collection the target lives in.
    const targetCollection = facilitySlug ? "facilities" : "organizations";
    const targetId = (facilitySlug ?? orgId) as string;

    const [planSnap, targetSnap] = await Promise.all([
      db.collection("pricingPlans").doc(planId).get(),
      db.collection(targetCollection).doc(targetId).get(),
    ]);
    if (!planSnap.exists) throw new HttpsError("not-found", "Plan introuvable.");
    if (!targetSnap.exists) throw new HttpsError("not-found", "Cible introuvable.");

    const plan = planSnap.data() as {
      price?: number;
      isActive?: boolean;
      lineOfBusiness?: string;
      billingPeriod?: string;
      name?: string;
    };
    const target = targetSnap.data() as { ownerUid?: string; managerUids?: string[]; name?: string };

    if (plan.lineOfBusiness !== "pages" || !plan.isActive || typeof plan.price !== "number") {
      throw new HttpsError("failed-precondition", "Plan indisponible.");
    }
    const isManager = target.ownerUid === uid || (target.managerUids ?? []).includes(uid);
    if (!isManager) throw new HttpsError("permission-denied", "Vous ne gérez pas cette page.");

    const redirectPath = facilitySlug
      ? `/dashboard/facilities/${facilitySlug}`
      : `/dashboard/pages/${orgId}`;

    const pendingRef = await db.collection("pendingCharges").add({
      kind: "subscription",
      payerUid: uid,
      planId,
      // Exactly one of these is set; the webhook routes by whichever is present.
      ...(facilitySlug ? { facilitySlug } : { orgId }),
      amount: plan.price,
      billingPeriod: plan.billingPeriod ?? "monthly",
      paymentType: paymentType ?? null,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    const { checkoutUrl, providerTransactionId } = await postBictorysCharge({
      amount: plan.price,
      merchantReference: pendingRef.id,
      description: `Abonnement ${plan.name ?? planId} — ${target.name ?? targetId}`,
      paymentType,
      redirectPath,
    });
    await pendingRef.update({ providerTransactionId, checkoutUrl });
    return { checkoutUrl, pendingId: pendingRef.id };
  },
);

/**
 * Create a charge to buy ticket(s) for a paid event. Validates seats and price
 * server-side; the webhook decrements seats and issues the ticket on success.
 */
export const createTicketCharge = onCall(
  { secrets: [BICTORYS_API_KEY], cors: CORS_ORIGINS },
  async (request) => {
    const { eventId, quantity, paymentType } = (request.data ?? {}) as {
      eventId?: string;
      quantity?: number;
      paymentType?: PaymentType;
    };
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Connexion requise.");
    if (!eventId) throw new HttpsError("invalid-argument", "eventId requis.");
    const qty = typeof quantity === "number" && quantity > 0 ? Math.min(Math.floor(quantity), 10) : 1;

    const evSnap = await db.collection("events").doc(eventId).get();
    if (!evSnap.exists) throw new HttpsError("not-found", "Événement introuvable.");
    const ev = evSnap.data() as {
      title?: string;
      priceAmount?: number;
      seatsLeft?: number;
      ticketingEnabled?: boolean;
      commissionRate?: number;
    };
    if (!ev.ticketingEnabled || typeof ev.priceAmount !== "number" || ev.priceAmount <= 0) {
      throw new HttpsError("failed-precondition", "Billetterie indisponible pour cet événement.");
    }
    if ((ev.seatsLeft ?? 0) < qty) {
      throw new HttpsError("resource-exhausted", "Plus assez de places disponibles.");
    }

    const amount = ev.priceAmount * qty;
    const pendingRef = await db.collection("pendingCharges").add({
      kind: "ticket",
      payerUid: uid,
      eventId,
      quantity: qty,
      amount,
      commissionRate: ev.commissionRate ?? 0.09,
      paymentType: paymentType ?? null,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    const { checkoutUrl, providerTransactionId } = await postBictorysCharge({
      amount,
      merchantReference: pendingRef.id,
      description: `Billet — ${ev.title ?? eventId} ×${qty}`,
      paymentType,
      redirectPath: `/evenements/${eventId}`,
    });
    await pendingRef.update({ providerTransactionId, checkoutUrl });
    return { checkoutUrl, pendingId: pendingRef.id };
  },
);

// ---------------------------------------------------------------------------
// Directory import — Google Places (admin-only)
// ---------------------------------------------------------------------------
// The Places API key is SECRET and stays server-side. Admins search for health
// facilities, preview candidates, then import the selected ones as `organizations`
// pages (source=imported, unclaimed) that patients can later claim.

interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  rating: number | null;
  alreadyImported: boolean;
}

/**
 * These run as `onRequest` (HTTP) functions reached through a Firebase Hosting
 * rewrite (`/api/...`). Hosting invokes them with its own service identity, so
 * they work even when an org policy (Domain Restricted Sharing) forbids public
 * `allUsers` invocation of callable functions. Access control is enforced here:
 * the caller must send a Firebase ID token and be an admin/super_admin.
 */

/** Apply permissive-but-scoped CORS and answer preflight. Returns true if handled. */
function handleCors(req: Request, res: Response): boolean {
  const origin = req.headers.origin ?? "";
  const allowed = CORS_ORIGINS.some((o) =>
    typeof o === "string" ? o === origin : o.test(origin),
  );
  if (allowed) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

/** Verify the Firebase ID token and require an admin/super_admin role. */
async function requireAdmin(req: Request): Promise<string> {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  if (!match) throw { httpStatus: 401, message: "Connexion requise." };
  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(match[1])).uid;
  } catch {
    throw { httpStatus: 401, message: "Jeton invalide." };
  }
  const snap = await db.collection("users").doc(uid).get();
  const role = (snap.data() as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "super_admin") {
    throw { httpStatus: 403, message: "Réservé aux administrateurs." };
  }
  return uid;
}

function sendError(res: Response, err: unknown): void {
  const e = err as { httpStatus?: number; message?: string };
  res.status(e.httpStatus ?? 500).json({ error: e.message ?? "Erreur serveur." });
}

/** Search Google Places (Text Search) and flag candidates already in the directory. */
async function doSearchPlaces(query: string): Promise<PlaceCandidate[]> {
  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}&region=sn&language=fr&key=${PLACES_API_KEY.value()}`;
  const res = await fetch(url);
  if (!res.ok) throw { httpStatus: 502, message: `Places a renvoyé ${res.status}.` };
  const data = (await res.json()) as {
    status: string;
    results?: {
      place_id: string;
      name: string;
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
      rating?: number;
    }[];
  };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw { httpStatus: 502, message: `Places: ${data.status}.` };
  }

  const results = data.results ?? [];
  const existing = new Set<string>();
  await Promise.all(
    results.map(async (r) => {
      const snap = await db
        .collection("organizations")
        .where("placeId", "==", r.place_id)
        .limit(1)
        .get();
      if (!snap.empty) existing.add(r.place_id);
    }),
  );

  return results
    .filter((r) => r.geometry?.location)
    .map((r) => ({
      placeId: r.place_id,
      name: r.name,
      address: r.formatted_address ?? "",
      coords: { lat: r.geometry!.location!.lat, lng: r.geometry!.location!.lng },
      rating: r.rating ?? null,
      alreadyImported: existing.has(r.place_id),
    }));
}

export const searchPlaces = onRequest(
  { secrets: [PLACES_API_KEY] },
  async (req, res) => {
    if (handleCors(req, res)) return;
    try {
      await requireAdmin(req);
      const { query } = (req.body ?? {}) as { query?: string };
      if (!query || query.trim().length < 3) {
        throw { httpStatus: 400, message: "Requête trop courte." };
      }
      res.json({ candidates: await doSearchPlaces(query.trim()) });
    } catch (err) {
      sendError(res, err);
    }
  },
);

// Compact category inference for server-side imports (mirrors src/lib/
// facilityTaxonomy on the client; kept inline since functions can't import src).
function inferCategory(types: string[] | undefined, name: string): string {
  const set = new Set((types ?? []).map((t) => t.toLowerCase()));
  if (set.has("dentist")) return "cabinet_dentaire";
  if (set.has("pharmacy") || set.has("drugstore")) return "pharmacie";
  if (set.has("hospital")) return "hopital";
  if (set.has("doctor") || set.has("physiotherapist")) return "cabinet";
  const n = name.toLowerCase();
  if (/pharmacie|officine/.test(n)) return "pharmacie";
  if (/h[oô]pital|chu|chn/.test(n)) return "hopital";
  if (/poste de sant/.test(n)) return "poste_sante";
  if (/centre de sant|case de sant/.test(n)) return "centre_sante";
  if (/maternit/.test(n)) return "maternite";
  if (/laboratoire|analyses?/.test(n)) return "laboratoire";
  if (/clinique/.test(n)) return "clinique";
  if (/cabinet/.test(n)) return "cabinet";
  return "autre";
}

/** Import selected Places as unclaimed directory pages (fetches details server-side). */
async function doImportPlaces(
  placeIds: string[],
  region: string | undefined,
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;
  for (const placeId of placeIds.slice(0, 50)) {
    // Dedupe: never import the same place twice.
    const dup = await db
      .collection("organizations")
      .where("placeId", "==", placeId)
      .limit(1)
      .get();
    if (!dup.empty) {
      skipped++;
      continue;
    }

    const detailsUrl =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${placeId}&language=fr` +
      `&fields=name,formatted_address,geometry,formatted_phone_number,opening_hours,rating,address_component,type` +
      `&key=${PLACES_API_KEY.value()}`;
    const res = await fetch(detailsUrl);
    if (!res.ok) {
      skipped++;
      continue;
    }
    const json = (await res.json()) as {
      status: string;
      result?: {
        name?: string;
        formatted_address?: string;
        geometry?: { location?: { lat: number; lng: number } };
        formatted_phone_number?: string;
        opening_hours?: { weekday_text?: string[] };
        rating?: number;
        types?: string[];
        address_components?: { long_name: string; types: string[] }[];
      };
    };
    const r = json.result;
    if (json.status !== "OK" || !r?.geometry?.location) {
      skipped++;
      continue;
    }
    const city =
      r.address_components?.find((c) => c.types.includes("locality"))?.long_name ?? "";
    const name = r.name ?? "Structure de santé";

    await db.collection("organizations").add({
      type: "healthcare_facility",
      category: inferCategory(r.types, name),
      name,
      ownerUid: "",
      managerUids: [],
      status: "active",
      region: region ?? "",
      city,
      address: r.formatted_address ?? "",
      coords: r.geometry.location,
      phone: r.formatted_phone_number ?? "",
      hours: r.opening_hours?.weekday_text?.join(" · ") ?? "",
      rating: r.rating ?? null,
      source: "imported",
      placeId,
      claimStatus: "unclaimed",
      logo: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    imported++;
  }
  return { imported, skipped };
}

export const importPlaces = onRequest(
  { secrets: [PLACES_API_KEY] },
  async (req, res) => {
    if (handleCors(req, res)) return;
    try {
      await requireAdmin(req);
      const { placeIds, region } = (req.body ?? {}) as { placeIds?: string[]; region?: string };
      if (!Array.isArray(placeIds) || placeIds.length === 0) {
        throw { httpStatus: 400, message: "Aucun lieu sélectionné." };
      }
      res.json(await doImportPlaces(placeIds, region));
    } catch (err) {
      sendError(res, err);
    }
  },
);

// ---------------------------------------------------------------------------
// Chatwoot (support omnicanal) + Brevo (email transactionnel)
// ---------------------------------------------------------------------------
// Chatwoot centralise web + WhatsApp + email + réseaux sociaux côté agents.
// Ce dépôt code : l'identité vérifiée (HMAC) du widget web, la réception des
// événements (webhook → notifications in-app), le push des formulaires publics
// vers l'inbox (contacts/conversations), et l'email sortant via Brevo.
// Tout est dégradé proprement : sans secret/param, on log et on ne bloque rien.

/** Generate the Chatwoot `identifier_hash` for a verified web widget session. */
export const chatwootIdentity = onCall(
  { secrets: [CHATWOOT_HMAC_TOKEN], cors: CORS_ORIGINS },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Connexion requise.");
    const token = CHATWOOT_HMAC_TOKEN.value();
    if (!token) throw new HttpsError("failed-precondition", "Identité Chatwoot non configurée.");
    // identifier_hash = HMAC_SHA256(hmac_token, identifier). L'identifiant est l'uid Firebase.
    const identifierHash = createHmac("sha256", token).update(uid).digest("hex");
    return { identifierHash };
  },
);

/** Parse a `Name <email>` sender string into Brevo's expected shape. */
function parseSender(raw: string): { name: string; email: string } {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(raw);
  if (m && m[2]) return { name: m[1] || "Wergu Yaram", email: m[2].trim() };
  return { name: "Wergu Yaram", email: raw.trim() };
}

/** Wrap body copy in a minimal branded HTML shell. */
function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#1f2933">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
      <tr><td style="background:#0c8a4f;padding:20px 28px;color:#fff;font-size:18px;font-weight:bold">Wergu Yaram</td></tr>
      <tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:20px">${title}</h1>${bodyHtml}</td></tr>
      <tr><td style="padding:18px 28px;background:#f0f2f4;font-size:12px;color:#697586">Wergu Yaram — annuaire santé du Sénégal. Vous recevez cet email suite à une action sur la plateforme.</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

const xof = (n: number): string => `${n.toLocaleString("fr-FR")} XOF`;

function donationReceiptHtml(amount: number, tip: number): string {
  const tipLine = tip > 0 ? `<p style="margin:0 0 8px">Dont soutien à la plateforme : <strong>${xof(tip)}</strong></p>` : "";
  return emailShell(
    "Merci pour votre don 🙏",
    `<p style="margin:0 0 8px">Nous confirmons la réception de votre don de <strong>${xof(amount)}</strong>.</p>
     ${tipLine}
     <p style="margin:16px 0 0">Votre générosité finance directement les besoins en équipement des structures de santé. Ce message tient lieu de reçu.</p>`,
  );
}

function newsletterWelcomeHtml(): string {
  return emailShell(
    "Bienvenue dans la communauté",
    `<p style="margin:0 0 8px">Merci de votre inscription à la newsletter Wergu Yaram.</p>
     <p style="margin:0">Vous recevrez nos actualités santé, nouvelles structures référencées et campagnes de soutien.</p>`,
  );
}

function subscriptionReminderHtml(endIso: string): string {
  const date = endIso ? new Date(endIso).toLocaleDateString("fr-FR") : "bientôt";
  return emailShell(
    "Votre abonnement arrive à échéance",
    `<p style="margin:0 0 8px">Votre abonnement de page expire le <strong>${date}</strong>.</p>
     <p style="margin:0">Renouvelez-le depuis votre tableau de bord pour conserver votre badge et votre visibilité.</p>`,
  );
}

/** Send a transactional email via Brevo. Returns false (no throw) when unconfigured. */
async function sendEmail(params: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}): Promise<boolean> {
  const apiKey = BREVO_API_KEY.value();
  if (!apiKey) {
    logger.info("Brevo non configuré — email ignoré.", { subject: params.subject });
    return false;
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: parseSender(BREVO_SENDER.value()),
      to: params.to,
      subject: params.subject,
      htmlContent: params.htmlContent,
    }),
  });
  if (!res.ok) {
    logger.error("Brevo a renvoyé une erreur.", { status: res.status, body: await res.text() });
    return false;
  }
  return true;
}

/**
 * Create a contact + conversation + first message in the Chatwoot website inbox.
 * Lets the team handle newsletter signups / support intents from the same inbox
 * as WhatsApp/email/web. Returns false (no throw) when the API isn't configured.
 */
async function pushToChatwoot(params: {
  name: string;
  email: string;
  identifier?: string;
  message: string;
  customAttributes?: Record<string, unknown>;
}): Promise<boolean> {
  const base = CHATWOOT_BASE_URL.value();
  const accountId = CHATWOOT_ACCOUNT_ID.value();
  const inboxId = CHATWOOT_WEBSITE_INBOX_ID.value();
  const apiToken = CHATWOOT_API_TOKEN.value();
  if (!base || !accountId || !inboxId || !apiToken) {
    logger.info("Chatwoot API non configurée — push ignoré.");
    return false;
  }
  const headers = { api_access_token: apiToken, "Content-Type": "application/json" };
  const root = `${base}/api/v1/accounts/${accountId}`;

  // 1. Upsert the contact in the inbox; the response carries a source_id.
  const contactRes = await fetch(`${root}/contacts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inbox_id: Number(inboxId),
      name: params.name,
      email: params.email,
      identifier: params.identifier,
      custom_attributes: params.customAttributes ?? {},
    }),
  });
  if (!contactRes.ok) {
    logger.error("Chatwoot: création du contact échouée.", { status: contactRes.status, body: await contactRes.text() });
    return false;
  }
  const contact = (await contactRes.json()) as {
    payload?: { contact?: { id?: number; contact_inboxes?: { source_id?: string }[] } };
  };
  const contactId = contact.payload?.contact?.id;
  const sourceId = contact.payload?.contact?.contact_inboxes?.[0]?.source_id;
  if (!contactId || !sourceId) {
    logger.error("Chatwoot: contact sans id/source_id.", { contact });
    return false;
  }

  // 2. Open a conversation for that contact in the inbox.
  const convRes = await fetch(`${root}/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ source_id: sourceId, inbox_id: Number(inboxId), contact_id: contactId }),
  });
  if (!convRes.ok) {
    logger.error("Chatwoot: création de la conversation échouée.", { status: convRes.status, body: await convRes.text() });
    return false;
  }
  const conv = (await convRes.json()) as { id?: number };
  if (!conv.id) return false;

  // 3. Post the first (incoming) message.
  const msgRes = await fetch(`${root}/conversations/${conv.id}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content: params.message, message_type: "incoming" }),
  });
  if (!msgRes.ok) {
    logger.error("Chatwoot: envoi du message échoué.", { status: msgRes.status, body: await msgRes.text() });
    return false;
  }
  return true;
}

/**
 * Chatwoot webhook → in-app notification when an agent replies.
 * Chatwoot doesn't sign its webhooks, so we gate on a shared token (header
 * `X-Webhook-Token` or `?token=` on the URL configured in Chatwoot). Writes are
 * idempotent on the Chatwoot message id.
 */
export const chatwootWebhook = onRequest(
  { secrets: [CHATWOOT_WEBHOOK_TOKEN] },
  async (req, res) => {
    const token = CHATWOOT_WEBHOOK_TOKEN.value();
    const provided = String(req.headers["x-webhook-token"] ?? req.query.token ?? "");
    const valid =
      Boolean(token) &&
      provided.length === token.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(token));
    if (!valid) {
      res.status(401).send("invalid token");
      return;
    }

    const event = req.body as {
      event?: string;
      message_type?: string;
      content?: string;
      id?: number;
      conversation?: { id?: number };
      contact?: { identifier?: string };
      meta?: { sender?: { identifier?: string } };
    };

    // Only outgoing messages (agent → user) become a user-facing notification.
    if (event.event === "message_created" && event.message_type === "outgoing") {
      const identifier = event.contact?.identifier ?? event.meta?.sender?.identifier ?? null;
      const messageId = event.id;
      if (identifier && messageId) {
        await db
          .collection("users").doc(identifier)
          .collection("notifications").doc(`cw_${messageId}`)
          .set(
            {
              type: "support_reply",
              title: "Nouvelle réponse de l'équipe support",
              body: (event.content ?? "").slice(0, 280),
              conversationId: event.conversation?.id ?? null,
              read: false,
              createdAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
    }

    res.status(200).send("ok");
  },
);

/** Newsletter signup → Chatwoot contact + welcome email (best-effort). */
export const onNewsletterSignup = onDocumentCreated(
  { document: "newsletterSignups/{id}", secrets: [CHATWOOT_API_TOKEN, BREVO_API_KEY] },
  async (event) => {
    const data = event.data?.data() as { email?: string; source?: string } | undefined;
    if (!data?.email) return;
    await Promise.allSettled([
      pushToChatwoot({
        name: data.email,
        email: data.email,
        message: `Nouvelle inscription newsletter (source : ${data.source ?? "site"}).`,
        customAttributes: { type: "newsletter", source: data.source ?? "site" },
      }),
      sendEmail({
        to: [{ email: data.email }],
        subject: "Bienvenue dans la communauté Wergu Yaram",
        htmlContent: newsletterWelcomeHtml(),
      }),
    ]);
  },
);

/** Recurring-support intent → Chatwoot conversation so the team can follow up. */
export const onSupportIntent = onDocumentCreated(
  { document: "supportIntents/{id}", secrets: [CHATWOOT_API_TOKEN] },
  async (event) => {
    const data = event.data?.data() as { email?: string; monthlyAmount?: number } | undefined;
    if (!data?.email) return;
    await pushToChatwoot({
      name: data.email,
      email: data.email,
      message: `Intention de soutien récurrent : ${xof(data.monthlyAmount ?? 0)}/mois. À recontacter pour finaliser.`,
      customAttributes: { type: "support_intent", monthlyAmount: data.monthlyAmount ?? null },
    });
  },
);

/**
 * Campagne de prévention ciblée (SMS/WhatsApp) — admin uniquement.
 *
 * Résout l'audience (utilisateurs consentants au canal, filtrés par intérêt/région),
 * enregistre la campagne, puis dispatche via Chatwoot (qui délivre par le canal
 * connecté). Le consentement (opt-in) est obligatoire ; dispatch gracieux (no-op)
 * si Chatwoot n'est pas configuré. Plafonné pour borner le coût.
 */
// Default monthly campaign quota for a partner space (anti-abus). Overridable
// per tenant via tenants/<slug>.campaignQuota.monthly (admin-set).
const DEFAULT_CAMPAIGN_QUOTA = 1000;

export const sendCampaign = onCall(
  { secrets: [CHATWOOT_API_TOKEN], cors: CORS_ORIGINS },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Connexion requise.");
    const actorSnap = await db.collection("users").doc(uid).get();
    const role = (actorSnap.data() as { role?: string } | undefined)?.role;
    const isAdmin = role === "admin" || role === "super_admin";

    const { title, channel, message, segment, tenantSlug } = (request.data ?? {}) as {
      title?: string;
      channel?: "sms" | "whatsapp";
      message?: string;
      segment?: { interest?: string; region?: string; communitySlug?: string };
      tenantSlug?: string;
    };
    if (!title || !message || (channel !== "sms" && channel !== "whatsapp")) {
      throw new HttpsError("invalid-argument", "Titre, canal (sms|whatsapp) et message requis.");
    }

    // Authorisation: admins → global ; sinon le manager d'un tenant → campagne
    // scopée à son espace (audience restreinte + quota).
    let tenant: { slug: string } | null = null;
    if (!isAdmin) {
      if (!tenantSlug) throw new HttpsError("permission-denied", "Réservé aux administrateurs ou gestionnaires d'espace.");
      const tSnap = await db.collection("tenants").doc(tenantSlug).get();
      const t = tSnap.data() as { ownerUid?: string; managerUids?: string[] } | undefined;
      const isManager = !!t && (t.ownerUid === uid || (t.managerUids ?? []).includes(uid));
      if (!isManager) throw new HttpsError("permission-denied", "Vous ne gérez pas cet espace partenaire.");
      tenant = { slug: tenantSlug };
    }

    const seg = segment ?? {};
    const consentField = channel === "whatsapp" ? "whatsappConsent" : "smsConsent";

    // Audience : utilisateurs ayant consenti au canal (index simple), filtrés en
    // mémoire par intérêt/région.
    const snap = await db.collection("users").where(consentField, "==", true).limit(2000).get();
    let recipients = snap.docs
      .map((d) => d.data() as { phone?: string; region?: string; displayName?: string; email?: string; interests?: string[] })
      .filter(
        (u) =>
          !!u.phone &&
          (!seg.interest || (u.interests ?? []).includes(seg.interest)) &&
          (!seg.region || u.region === seg.region),
      );

    // Tenant scope: restreindre aux utilisateurs dont les intérêts recoupent les
    // thèmes des communautés de l'espace (jamais la base globale).
    if (tenant) {
      const comms = await db.collection("communities").where("tenantSlug", "==", tenant.slug).get();
      const interests = new Set<string>();
      comms.forEach((c) => ((c.data().relatedInterests as string[] | undefined) ?? []).forEach((i) => interests.add(i)));
      recipients = recipients.filter((u) => (u.interests ?? []).some((i) => interests.has(i)));
    }

    const capped = recipients.slice(0, 500);
    const targeted = capped.length;

    // Quota mensuel (tenant) — réservation atomique avant envoi.
    if (tenant) {
      const now = new Date();
      const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
      const tenantRef = db.collection("tenants").doc(tenant.slug);
      await db.runTransaction(async (tx) => {
        const s = await tx.get(tenantRef);
        const q = (s.data()?.campaignQuota ?? {}) as { monthly?: number; sentThisMonth?: number; periodKey?: string };
        const monthly = q.monthly ?? DEFAULT_CAMPAIGN_QUOTA;
        const sentThisMonth = q.periodKey === monthKey ? (q.sentThisMonth ?? 0) : 0;
        if (sentThisMonth + targeted > monthly) {
          throw new HttpsError("resource-exhausted", `Quota mensuel de campagnes atteint (${monthly} messages).`);
        }
        tx.update(tenantRef, {
          campaignQuota: { monthly, sentThisMonth: sentThisMonth + targeted, periodKey: monthKey },
        });
      });
    }

    const ref = await db.collection("campaigns").add({
      title,
      channel,
      message,
      segment: seg,
      status: "sent",
      targetedCount: targeted,
      sentCount: 0,
      createdByUid: uid,
      tenantSlug: tenant?.slug ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    let sent = 0;
    for (const u of capped) {
      const ok = await pushToChatwoot({
        name: u.displayName ?? u.phone!,
        email: u.email ?? `${u.phone}@sms.local`,
        identifier: u.phone!,
        message,
        customAttributes: { type: "campaign", channel, campaignId: ref.id, tenantSlug: tenant?.slug ?? null },
      });
      if (ok) sent++;
    }
    await ref.update({ sentCount: sent });
    return { campaignId: ref.id, targeted, sent };
  },
);

/** Bictorys payment notifications → credit the campaign once paid. */
export const bictorysWebhook = onRequest(
  { secrets: [BICTORYS_WEBHOOK_SECRET, BREVO_API_KEY] },
  async (req, res) => {
    // Signature verification (HMAC of the raw body). Adjust the header name to
    // match Bictorys' actual scheme.
    const signature = String(req.headers["x-signature"] ?? req.headers["x-bictorys-signature"] ?? "");
    // Garde : une requête sans signature ou sans corps brut est rejetée (401)
    // au lieu de faire planter createHmac().update(undefined) → 500.
    if (!signature || !req.rawBody) {
      res.status(401).send("invalid signature");
      return;
    }
    const expected = createHmac("sha256", BICTORYS_WEBHOOK_SECRET.value())
      .update(req.rawBody)
      .digest("hex");
    const ok =
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!ok) {
      res.status(401).send("invalid signature");
      return;
    }

    const event = req.body as { status?: string; merchantReference?: string };
    const status = event.status;
    const ref = event.merchantReference;
    if (!ref) {
      res.status(400).send("missing reference");
      return;
    }
    const providerTxnId =
      (event as { id?: string }).id ?? (event as { transactionId?: string }).transactionId ?? null;
    const isPaid = status === "succeeded" || status === "success" || status === "paid";

    // --- Path 1: donation (merchantReference = donation id) — unchanged ---
    const donationRef = db.collection("donations").doc(ref);
    const donationSnap = await donationRef.get();
    if (donationSnap.exists) {
      const donation = donationSnap.data() as {
        amount: number;
        tipAmount?: number;
        needId: string;
        status: string;
        paymentType?: PaymentType | null;
        donorUid?: string | null;
      };
      if (isPaid && donation.status !== "succeeded") {
        const tip = donation.tipAmount ?? 0;
        const total = donation.amount + tip;
        const fees = Math.round(total * FEE_RATE);
        await db.runTransaction(async (tx) => {
          // The need is credited with the donation amount only (not the tip).
          const needRef = db.collection("equipmentNeeds").doc(donation.needId);
          tx.update(needRef, {
            raisedAmount: FieldValue.increment(donation.amount),
            donorsCount: FieldValue.increment(1),
          });
          tx.update(donationRef, { status: "succeeded", paidAt: FieldValue.serverTimestamp() });
          tx.set(db.collection("transactions").doc(ref), {
            type: tip > 0 ? "donation_tip" : "donation",
            lineOfBusiness: "donations",
            payerUid: donation.donorUid ?? null,
            refId: donation.needId,
            amount: total,
            currency: "XOF",
            fees,
            platformAmount: tip,
            netAmount: donation.amount,
            status: "completed",
            paymentMethod: donation.paymentType ?? null,
            providerTransactionId: providerTxnId,
            metadata: { source: "bictorys_webhook", donationId: ref },
            createdAt: FieldValue.serverTimestamp(),
          });
        });

        // Reçu de don par email (best-effort, env-gated via BREVO_API_KEY).
        if (donation.donorUid) {
          const donorSnap = await db.collection("users").doc(donation.donorUid).get();
          const donorEmail = (donorSnap.data() as { email?: string } | undefined)?.email;
          if (donorEmail) {
            await sendEmail({
              to: [{ email: donorEmail }],
              subject: "Reçu de votre don — Wergu Yaram",
              htmlContent: donationReceiptHtml(donation.amount, tip),
            }).catch((e) => logger.error("Reçu de don non envoyé.", e));
          }
        }
      } else if (!isPaid && status) {
        await donationRef.update({ status });
      }
      res.status(200).send("ok");
      return;
    }

    // --- Path 2: pendingCharges (subscriptions, tickets) ---
    const pendingRef = db.collection("pendingCharges").doc(ref);
    const pendingSnap = await pendingRef.get();
    if (!pendingSnap.exists) {
      res.status(404).send("unknown reference");
      return;
    }
    const pending = pendingSnap.data() as {
      kind: "subscription" | "ticket";
      status: string;
      payerUid?: string | null;
      planId?: string;
      orgId?: string;
      facilitySlug?: string;
      eventId?: string;
      quantity?: number;
      amount: number;
      billingPeriod?: string;
      paymentType?: PaymentType | null;
      commissionRate?: number;
    };

    if (!isPaid) {
      if (status) await pendingRef.update({ status });
      res.status(200).send("ok");
      return;
    }
    if (pending.status === "succeeded") {
      res.status(200).send("ok"); // idempotent
      return;
    }

    const DAY = 24 * 60 * 60 * 1000;
    const fees = Math.round(pending.amount * FEE_RATE);

    if (pending.kind === "subscription" && (pending.orgId || pending.facilitySlug)) {
      const periodDays = pending.billingPeriod === "yearly" ? 365 : 30;
      const tier = pending.planId?.includes("pro") ? "pro" : "verified";
      // Target = a partner page (organizations) or a health establishment (facilities).
      const targetCollection = pending.facilitySlug ? "facilities" : "organizations";
      const targetId = (pending.facilitySlug ?? pending.orgId) as string;
      const subRef = db.collection("subscriptions").doc(targetId); // one sub per target
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(subRef); // read before writes
        const nowMs = Date.now();
        const prevEnd = existing.exists
          ? Date.parse((existing.data() as { currentPeriodEnd?: string }).currentPeriodEnd ?? "")
          : NaN;
        const from = Number.isFinite(prevEnd) && prevEnd > nowMs ? prevEnd : nowMs;
        const newEnd = new Date(from + periodDays * DAY).toISOString();
        tx.set(
          subRef,
          {
            subscriberUid: pending.payerUid ?? null,
            ...(pending.facilitySlug ? { facilitySlug: pending.facilitySlug } : { orgId: pending.orgId }),
            planId: pending.planId,
            status: "active",
            currentPeriodStart: new Date(nowMs).toISOString(),
            currentPeriodEnd: newEnd,
            cancelAtPeriodEnd: false,
            renewalReminded: false,
            provider: "bictorys",
            updatedAt: FieldValue.serverTimestamp(),
            ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
          },
          { merge: true },
        );
        tx.set(
          db.collection(targetCollection).doc(targetId),
          {
            planTier: tier,
            planId: pending.planId,
            featured: tier === "pro",
            subscribedUntil: newEnd,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        tx.set(db.collection("transactions").doc(ref), {
          type: "subscription",
          lineOfBusiness: "pages",
          payerUid: pending.payerUid ?? null,
          refId: targetId,
          amount: pending.amount,
          currency: "XOF",
          fees,
          platformAmount: pending.amount - fees,
          netAmount: 0,
          status: "completed",
          paymentMethod: pending.paymentType ?? null,
          providerTransactionId: providerTxnId,
          metadata: {
            source: "bictorys_webhook",
            kind: "subscription",
            planId: pending.planId,
            ...(pending.facilitySlug ? { facilitySlug: pending.facilitySlug } : { orgId: pending.orgId }),
          },
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.update(pendingRef, { status: "succeeded", paidAt: FieldValue.serverTimestamp() });
      });
    } else if (pending.kind === "ticket" && pending.eventId) {
      const rate = pending.commissionRate ?? 0.09;
      const commission = Math.round(pending.amount * rate);
      const qty = pending.quantity ?? 1;
      await db.runTransaction(async (tx) => {
        tx.update(db.collection("events").doc(pending.eventId!), {
          seatsLeft: FieldValue.increment(-qty),
        });
        tx.set(db.collection("tickets").doc(ref), {
          eventId: pending.eventId,
          buyerUid: pending.payerUid ?? null,
          quantity: qty,
          amount: pending.amount,
          txnId: ref,
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.set(db.collection("transactions").doc(ref), {
          type: "ticket",
          lineOfBusiness: "events",
          payerUid: pending.payerUid ?? null,
          refId: pending.eventId,
          amount: pending.amount,
          currency: "XOF",
          fees,
          platformAmount: commission,
          netAmount: pending.amount - commission - fees,
          status: "completed",
          paymentMethod: pending.paymentType ?? null,
          providerTransactionId: providerTxnId,
          metadata: { source: "bictorys_webhook", kind: "ticket", eventId: pending.eventId },
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.set(db.collection("commissions").doc(ref), {
          transactionId: ref,
          beneficiaryUid: "",
          grossAmount: pending.amount,
          commissionRate: rate,
          commissionAmount: commission,
          netAmount: pending.amount - commission,
          payoutStatus: "pending",
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.update(pendingRef, { status: "succeeded", paidAt: FieldValue.serverTimestamp() });
      });
    }

    res.status(200).send("ok");
  },
);

/**
 * Daily: remind subscribers whose period ends within 7 days (in-app reminder),
 * and downgrade pages whose subscription has expired (pay-per-period model — no
 * auto-debit, so a lapsed payment must lose the entitlement).
 */
export const remindDueSubscriptions = onSchedule(
  { schedule: "every day 09:00", secrets: [BREVO_API_KEY] },
  async () => {
  const now = Date.now();
  const soonIso = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  const due = await db
    .collection("subscriptions")
    .where("status", "==", "active")
    .where("currentPeriodEnd", "<=", soonIso)
    .get();

  for (const docSnap of due.docs) {
    const sub = docSnap.data() as {
      currentPeriodEnd?: string;
      subscriberUid?: string;
      renewalReminded?: boolean;
      orgId?: string;
      facilitySlug?: string;
    };
    const endMs = Date.parse(sub.currentPeriodEnd ?? "");
    if (!Number.isFinite(endMs)) continue;

    if (endMs < now) {
      // Expired → revoke entitlement on the target (org page or facility).
      await docSnap.ref.update({ status: "past_due", updatedAt: FieldValue.serverTimestamp() });
      const targetCollection = sub.facilitySlug ? "facilities" : sub.orgId ? "organizations" : null;
      const targetId = sub.facilitySlug ?? sub.orgId;
      if (targetCollection && targetId) {
        await db.collection(targetCollection).doc(targetId).update({
          planTier: FieldValue.delete(),
          featured: false,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } else if (!sub.renewalReminded && sub.subscriberUid) {
      // In-app reminder (surfaces in the user dashboard's reminders list).
      await db.collection("users").doc(sub.subscriberUid).collection("reminders").add({
        title: "Votre abonnement de page arrive à échéance — pensez à le renouveler.",
        dueAt: sub.currentPeriodEnd,
        createdAt: FieldValue.serverTimestamp(),
      });
      // Rappel par email (best-effort, env-gated via BREVO_API_KEY).
      const subEmail = (await db.collection("users").doc(sub.subscriberUid).get()).data() as
        | { email?: string }
        | undefined;
      if (subEmail?.email) {
        await sendEmail({
          to: [{ email: subEmail.email }],
          subject: "Votre abonnement Wergu Yaram arrive à échéance",
          htmlContent: subscriptionReminderHtml(sub.currentPeriodEnd ?? ""),
        }).catch((e) => logger.error("Rappel d'abonnement non envoyé.", e));
      }
      await docSnap.ref.update({ renewalReminded: true });
    }
  }
});

/**
 * Daily: roll up completed transactions of the current month into per-line
 * `revenueReports` docs (id = `${YYYY-MM}_${line}`). Idempotent recompute.
 */
export const aggregateRevenue = onSchedule("every day 02:00", async () => {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const snap = await db
    .collection("transactions")
    .where("status", "==", "completed")
    .where("createdAt", ">=", Timestamp.fromDate(monthStart))
    .get();

  type Agg = { grossRevenue: number; fees: number; platformRevenue: number; transactionsCount: number };
  const byLine = new Map<string, Agg>();
  for (const d of snap.docs) {
    const t = d.data() as {
      lineOfBusiness?: string;
      amount?: number;
      fees?: number;
      platformAmount?: number;
    };
    const line = t.lineOfBusiness ?? "donations";
    const agg = byLine.get(line) ?? { grossRevenue: 0, fees: 0, platformRevenue: 0, transactionsCount: 0 };
    agg.grossRevenue += t.amount ?? 0;
    agg.fees += t.fees ?? 0;
    agg.platformRevenue += t.platformAmount ?? 0;
    agg.transactionsCount += 1;
    byLine.set(line, agg);
  }

  const batch = db.batch();
  for (const [line, agg] of byLine) {
    const ref = db.collection("revenueReports").doc(`${monthKey}_${line}`);
    batch.set(ref, {
      period: "monthly",
      date: monthKey,
      lineOfBusiness: line,
      grossRevenue: agg.grossRevenue,
      fees: agg.fees,
      commissions: 0,
      netRevenue: agg.platformRevenue,
      transactionsCount: agg.transactionsCount,
      newCustomers: 0,
      churnedCustomers: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
});

/**
 * Rolls raw internal page-views into per-tenant daily report docs
 * (`tenantReports/<slug>_views_<day>`, field `views` incremented) and deletes
 * the processed raw `pageViews` to cap storage. Bounded per run (Firestore
 * batch ≤ 500 writes); high-traffic spaces drain over successive runs.
 */
export const aggregateTenantPageviews = onSchedule("every day 03:00", async () => {
  const snap = await db.collection("pageViews").limit(350).get();
  if (snap.empty) return;

  const groups = new Map<string, { tenantSlug: string; day: string; count: number }>();
  for (const d of snap.docs) {
    const v = d.data() as { tenantSlug?: string; day?: string };
    if (!v.tenantSlug || !v.day) continue;
    const key = `${v.tenantSlug}_views_${v.day}`;
    const g = groups.get(key) ?? { tenantSlug: v.tenantSlug, day: v.day, count: 0 };
    g.count += 1;
    groups.set(key, g);
  }

  const batch = db.batch();
  for (const [key, g] of groups) {
    batch.set(
      db.collection("tenantReports").doc(key),
      {
        tenantSlug: g.tenantSlug,
        type: "views",
        day: g.day,
        views: FieldValue.increment(g.count),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  for (const d of snap.docs) batch.delete(d.ref);
  await batch.commit();
});

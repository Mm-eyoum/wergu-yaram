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
import { defineSecret, defineString } from "firebase-functions/params";
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

const MIN_AMOUNT = 500; // XOF
const MAX_AMOUNT = 5_000_000; // XOF — sanity ceiling for a single donation.

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
    const { needId, amount, paymentType } = (request.data ?? {}) as {
      needId?: string;
      amount?: number;
      paymentType?: PaymentType;
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
      currency: "XOF",
      status: "pending",
      paymentType: paymentType ?? null,
      donorUid: request.auth?.uid ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    const body: Record<string, unknown> = {
      amount,
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
      `&fields=name,formatted_address,geometry,formatted_phone_number,opening_hours,rating,address_component` +
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

    await db.collection("organizations").add({
      type: "healthcare_facility",
      name: r.name ?? "Structure de santé",
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

/** Bictorys payment notifications → credit the campaign once paid. */
export const bictorysWebhook = onRequest(
  { secrets: [BICTORYS_WEBHOOK_SECRET] },
  async (req, res) => {
    // Signature verification (HMAC of the raw body). Adjust the header name to
    // match Bictorys' actual scheme.
    const signature = String(req.headers["x-signature"] ?? req.headers["x-bictorys-signature"] ?? "");
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
    const donationId = event.merchantReference;
    if (!donationId) {
      res.status(400).send("missing reference");
      return;
    }

    const donationRef = db.collection("donations").doc(donationId);
    const snap = await donationRef.get();
    if (!snap.exists) {
      res.status(404).send("unknown donation");
      return;
    }
    const donation = snap.data() as { amount: number; needId: string; status: string };

    // Idempotency: only credit once, on a successful event.
    const isPaid = status === "succeeded" || status === "success" || status === "paid";
    if (isPaid && donation.status !== "succeeded") {
      await db.runTransaction(async (tx) => {
        const needRef = db.collection("equipmentNeeds").doc(donation.needId);
        tx.update(needRef, {
          raisedAmount: FieldValue.increment(donation.amount),
          donorsCount: FieldValue.increment(1),
        });
        tx.update(donationRef, { status: "succeeded", paidAt: FieldValue.serverTimestamp() });
      });
    } else if (!isPaid && status) {
      await donationRef.update({ status });
    }

    res.status(200).send("ok");
  },
);

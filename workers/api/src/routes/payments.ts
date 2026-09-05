/**
 * Création des charges de paiement (dons, abonnements, billets).
 *
 * Les paiements sont DORMANTS en production (`VITE_BICTORYS_ENABLED=false`) :
 * ce portage est complet et testé, mais rien ne l'exerce tant que Bictorys n'est
 * pas branché. C'est précisément ce qui rend ce lot peu risqué.
 */
import type { Env } from "../auth/context";
import { ApiError, json } from "../lib/http";
import {
  FEE_RATE,
  MAX_AMOUNT,
  MAX_TIP,
  MIN_AMOUNT,
  paymentRef,
  postBictorysCharge,
  type PaymentType,
} from "../integrations/bictorys";
import { assertHuman } from "../lib/turnstile";
import type { Ctx } from "../policy/types";

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 20;

void FEE_RATE; // les frais sont calculés côté webhook, à l'encaissement

function cfgOf(env: Env) {
  return {
    apiUrl: env.BICTORYS_API_URL ?? "https://api.bictorys.com",
    apiKey: env.BICTORYS_API_KEY,
    appUrl: env.APP_PUBLIC_URL,
  };
}

/**
 * Don à un besoin d'équipement. Les visiteurs NON connectés sont acceptés.
 *
 * ⚠️ La Cloud Function limitait le débit des seuls donateurs authentifiés, en
 * notant qu'elle « ne pouvait pas indexer les invités de façon sûre » : les dons
 * anonymes étaient donc totalement non bornés. Le Worker voit l'IP
 * (`cf-connecting-ip`) et peut exiger Turnstile — la migration resserre ce point
 * au lieu de le reconduire.
 */
export async function createDonationCharge(
  env: Env,
  ctx: Ctx,
  request: Request,
): Promise<Response> {
  const body = (await request.json()) as {
    needId?: string;
    amount?: number;
    paymentType?: PaymentType;
    tipAmount?: number;
    turnstileToken?: string;
  };

  const { needId } = body;
  const amount = body.amount;
  if (
    !needId ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < MIN_AMOUNT ||
    amount > MAX_AMOUNT
  ) {
    throw new ApiError(
      "invalid-argument",
      "needId et un montant valide (entre 500 et 5 000 000 XOF) sont requis.",
    );
  }

  // Pourboire plateforme optionnel : le besoin est crédité de `amount`, le
  // pourboire est du revenu plateforme. La charge totale vaut amount + tip.
  const tip =
    typeof body.tipAmount === "number" && Number.isFinite(body.tipAmount) && body.tipAmount > 0
      ? Math.min(Math.round(body.tipAmount), MAX_TIP)
      : 0;
  const total = amount + tip;

  const uid = ctx.actor?.uid ?? null;
  if (uid) {
    const since = Date.now() - RATE_WINDOW_MS;
    const recent = await env.DB.prepare(
      "SELECT count(*) AS n FROM donations WHERE donor_uid = ?1 AND created_at >= ?2",
    )
      .bind(uid, since)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= RATE_MAX) {
      throw new ApiError(
        "resource-exhausted",
        "Trop de tentatives de don récentes. Réessayez dans un moment.",
      );
    }
  } else {
    // Don anonyme : contrôle anti-robot, là où l'ancienne implémentation ne
    // bornait rien du tout.
    await assertHuman(
      body.turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      request.headers.get("cf-connecting-ip"),
    );
  }

  // Source de vérité serveur : le besoin doit exister (empêche une référence
  // arbitraire vers un document quelconque).
  const need = await env.DB.prepare(
    "SELECT json_extract(data,'$.title') AS title FROM documents WHERE collection='equipmentNeeds' AND id = ?1",
  )
    .bind(needId)
    .first<{ title: string | null }>();
  if (!need) throw new ApiError("not-found", "Besoin introuvable.");

  const id = paymentRef();
  await env.DB.prepare(
    `INSERT INTO donations (id, need_id, donor_uid, amount, tip_amount, currency, status,
                            provider, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 'XOF', 'pending', 'bictorys', ?6)`,
  )
    .bind(id, needId, uid, amount, tip, Date.now())
    .run();

  try {
    const charge = await postBictorysCharge(
      {
        amount: total,
        merchantReference: id,
        description: `Don — ${need.title ?? needId}`,
        paymentType: body.paymentType,
        redirectPath: `/besoins/${needId}`,
        redirectQuery: { success: "?don=succes", error: "?don=echec" },
      },
      cfgOf(env),
    );
    await env.DB.prepare(
      "UPDATE donations SET provider_transaction_id = ?1, checkout_url = ?2 WHERE id = ?3",
    )
      .bind(charge.providerTransactionId, charge.checkoutUrl, id)
      .run();
    return json({ checkoutUrl: charge.checkoutUrl, donationId: id });
  } catch (err) {
    await env.DB.prepare("UPDATE donations SET status = 'failed' WHERE id = ?1").bind(id).run();
    throw err;
  }
}

/** Abonnement d'une page (organisation) ou d'un établissement à un plan. */
export async function createPlanCharge(env: Env, ctx: Ctx, request: Request): Promise<Response> {
  if (!ctx.actor) throw new ApiError("unauthenticated", "Connexion requise.");
  const uid = ctx.actor.uid;

  const body = (await request.json()) as {
    planId?: string;
    orgId?: string;
    facilitySlug?: string;
    paymentType?: PaymentType;
  };
  if (!body.planId || (!body.orgId && !body.facilitySlug)) {
    throw new ApiError("invalid-argument", "planId et orgId ou facilitySlug requis.");
  }

  const plan = await env.DB.prepare(
    "SELECT price, is_active, line_of_business, billing_period, name FROM pricing_plans WHERE id = ?1",
  )
    .bind(body.planId)
    .first<{
      price: number;
      is_active: number;
      line_of_business: string;
      billing_period: string;
      name: string;
    }>();
  if (!plan) throw new ApiError("not-found", "Plan introuvable.");
  if (plan.line_of_business !== "pages" || plan.is_active !== 1 || typeof plan.price !== "number") {
    throw new ApiError("failed-precondition", "Plan indisponible.");
  }

  // La cible vit soit dans la table typée `organizations`, soit dans `documents`
  // (facilities) — le webhook reroute vers la même selon le champ renseigné.
  let isManager = false;
  let targetName = "";
  if (body.facilitySlug) {
    const row = await env.DB.prepare(
      `SELECT json_extract(data,'$.ownerUid') AS owner, json_extract(data,'$.name') AS name
         FROM documents WHERE collection='facilities' AND id = ?1`,
    )
      .bind(body.facilitySlug)
      .first<{ owner: string | null; name: string | null }>();
    if (!row) throw new ApiError("not-found", "Cible introuvable.");
    isManager = row.owner === uid;
    targetName = row.name ?? body.facilitySlug;
  } else {
    const row = await env.DB.prepare(
      "SELECT owner_uid, manager_uids, name FROM organizations WHERE id = ?1",
    )
      .bind(body.orgId)
      .first<{ owner_uid: string; manager_uids: string; name: string }>();
    if (!row) throw new ApiError("not-found", "Cible introuvable.");
    const managers = JSON.parse(row.manager_uids || "[]") as string[];
    isManager = row.owner_uid === uid || managers.includes(uid);
    targetName = row.name;
  }
  if (!isManager) throw new ApiError("permission-denied", "Vous ne gérez pas cette page.");

  const id = paymentRef();
  await env.DB.prepare(
    `INSERT INTO pending_charges (id, kind, payer_uid, plan_id, org_id, facility_slug,
                                  amount, billing_period, status, created_at, updated_at)
     VALUES (?1, 'subscription', ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, ?8)`,
  )
    .bind(
      id, uid, body.planId, body.orgId ?? null, body.facilitySlug ?? null,
      plan.price, plan.billing_period ?? "monthly", Date.now(),
    )
    .run();

  const charge = await postBictorysCharge(
    {
      amount: plan.price,
      merchantReference: id,
      description: `Abonnement ${plan.name} — ${targetName}`,
      paymentType: body.paymentType,
      redirectPath: body.facilitySlug
        ? `/dashboard/facilities/${body.facilitySlug}`
        : `/dashboard/pages/${body.orgId}`,
    },
    cfgOf(env),
  );

  await env.DB.prepare(
    "UPDATE pending_charges SET provider_transaction_id = ?1, checkout_url = ?2 WHERE id = ?3",
  )
    .bind(charge.providerTransactionId, charge.checkoutUrl, id)
    .run();

  return json({ checkoutUrl: charge.checkoutUrl, pendingId: id });
}

/**
 * Billet d'événement.
 *
 * ⚠️ BUG D'ORIGINE CONSERVÉ EN L'ÉTAT, MAIS SIGNALÉ : la vérification de
 * `seatsLeft` ne RÉSERVE rien ; le décrément n'a lieu qu'au webhook. Deux
 * acheteurs peuvent donc franchir le contrôle sur le dernier siège. Le corriger
 * demande un Durable Object par événement, avec expiration des réservations non
 * payées — une amélioration de comportement, pas de la parité. À traiter
 * séparément pour ne pas mêler correction et migration.
 */
export async function createTicketCharge(env: Env, ctx: Ctx, request: Request): Promise<Response> {
  if (!ctx.actor) throw new ApiError("unauthenticated", "Connexion requise.");

  const body = (await request.json()) as {
    eventId?: string;
    quantity?: number;
    paymentType?: PaymentType;
  };
  if (!body.eventId) throw new ApiError("invalid-argument", "eventId requis.");
  const qty = Math.min(Math.max(Math.round(body.quantity ?? 1), 1), 10);

  const evt = await env.DB.prepare(
    `SELECT json_extract(data,'$.title')          AS title,
            json_extract(data,'$.ticketingEnabled') AS enabled,
            json_extract(data,'$.priceAmount')    AS price,
            json_extract(data,'$.seatsLeft')      AS seats,
            json_extract(data,'$.commissionRate') AS rate
       FROM documents WHERE collection='events' AND id = ?1`,
  )
    .bind(body.eventId)
    .first<{ title: string | null; enabled: number | null; price: number | null; seats: number | null; rate: number | null }>();

  if (!evt) throw new ApiError("not-found", "Événement introuvable.");
  if (!evt.enabled || !evt.price || evt.price <= 0) {
    throw new ApiError("failed-precondition", "Billetterie indisponible pour cet événement.");
  }
  if ((evt.seats ?? 0) < qty) {
    throw new ApiError("failed-precondition", "Plus assez de places disponibles.");
  }

  const amount = evt.price * qty;
  const id = paymentRef();
  await env.DB.prepare(
    `INSERT INTO pending_charges (id, kind, payer_uid, event_id, quantity, commission_rate,
                                  amount, status, created_at, updated_at)
     VALUES (?1, 'ticket', ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?7)`,
  )
    .bind(id, ctx.actor.uid, body.eventId, qty, evt.rate ?? 0.09, amount, Date.now())
    .run();

  const charge = await postBictorysCharge(
    {
      amount,
      merchantReference: id,
      description: `Billet — ${evt.title ?? body.eventId} × ${qty}`,
      paymentType: body.paymentType,
      redirectPath: `/evenements/${body.eventId}`,
    },
    cfgOf(env),
  );

  await env.DB.prepare(
    "UPDATE pending_charges SET provider_transaction_id = ?1, checkout_url = ?2 WHERE id = ?3",
  )
    .bind(charge.providerTransactionId, charge.checkoutUrl, id)
    .run();

  return json({ checkoutUrl: charge.checkoutUrl, pendingId: id });
}

/**
 * Webhook Bictorys — encaissement des dons, abonnements et billets.
 *
 * TROIS POINTS STRUCTURANTS
 *
 * 1. SIGNATURE SUR LE CORPS BRUT. On lit les octets UNE seule fois, on vérifie,
 *    puis on parse CES MÊMES octets. Ne jamais appeler `request.json()` d'abord :
 *    la séquence d'octets d'origine serait irrécupérable, et la re-sérialiser
 *    la modifierait. `crypto.subtle.verify` est à temps constant, ce qui remplace
 *    à la fois `createHmac` et `timingSafeEqual`.
 *
 * 2. IDEMPOTENCE. D1 n'a PAS de transaction interactive : `batch()` est la seule
 *    primitive atomique. La PREMIÈRE instruction de chaque lot insère l'événement
 *    dans `webhook_events` ; une redistribution viole la clé primaire et annule
 *    tout le lot. C'est plus fort que l'original, dont l'idempotence reposait sur
 *    une lecture de statut faite HORS transaction.
 *
 * 3. EXTENSION DE PÉRIODE. Le calcul « repartir du max(fin précédente, maintenant) »
 *    était une lecture-modification-écriture protégée par `runTransaction`. Ici la
 *    lecture précède le lot, mais le verrou d'unicité rend le lot rejouable-sûr :
 *    une seconde livraison du même événement ne peut pas prolonger deux fois.
 */
import type { Env } from "../auth/context";
import { FEE_RATE, isPaidStatus } from "../integrations/bictorys";
import { outboxInsert } from "../lib/outbox";

const DAY_MS = 24 * 60 * 60 * 1000;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0) return new Uint8Array(0);
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function bictorysWebhook(env: Env, request: Request): Promise<Response> {
  const secret = env.BICTORYS_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook non configuré.", { status: 503 });

  const signature =
    request.headers.get("x-signature") ?? request.headers.get("x-bictorys-signature") ?? "";
  // Les octets bruts, lus une seule fois.
  const raw = new Uint8Array(await request.arrayBuffer());
  if (!signature || raw.byteLength === 0) {
    return new Response("invalid signature", { status: 401 });
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify("HMAC", key, hexToBytes(signature), raw);
  if (!ok) return new Response("invalid signature", { status: 401 });

  // Parsage des MÊMES octets que ceux qui viennent d'être vérifiés.
  const event = JSON.parse(new TextDecoder().decode(raw)) as {
    status?: string;
    merchantReference?: string;
    id?: string;
    transactionId?: string;
  };

  const ref = event.merchantReference;
  if (!ref) return new Response("missing reference", { status: 400 });

  const providerTxnId = event.id ?? event.transactionId ?? null;
  const paid = isPaidStatus(event.status);
  const now = Date.now();

  /** Verrou d'idempotence, toujours en tête de lot. */
  const lock = env.DB.prepare(
    "INSERT INTO webhook_events (id, provider, received_at) VALUES (?1, 'bictorys', ?2)",
  ).bind(`${ref}:${event.status ?? "?"}`, now);

  // --- Chemin 1 : don -------------------------------------------------------
  const donation = await env.DB.prepare(
    "SELECT id, need_id, donor_uid, amount, tip_amount, status FROM donations WHERE id = ?1",
  )
    .bind(ref)
    .first<{
      id: string;
      need_id: string;
      donor_uid: string | null;
      amount: number;
      tip_amount: number;
      status: string;
    }>();

  if (donation) {
    if (!paid) {
      if (event.status) {
        await env.DB.prepare("UPDATE donations SET status = ?1 WHERE id = ?2")
          .bind(event.status, ref)
          .run();
      }
      return new Response("ok");
    }
    if (donation.status === "succeeded") return new Response("ok"); // déjà encaissé

    const tip = donation.tip_amount ?? 0;
    const total = donation.amount + tip;
    const fees = Math.round(total * FEE_RATE);

    const statements = [
      lock,
      // Le besoin est crédité du montant SEUL, jamais du pourboire.
      env.DB.prepare(
        // ⚠️ CAST AS INTEGER indispensable : D1 transmet les nombres JS liés en
        // REAL, et `json_set` figerait alors « 6000.0 » dans le document. Les
        // montants sont en XOF — une devise sans sous-unité, donc entière.
        `UPDATE documents SET data = json_set(
            data,
            '$.raisedAmount', CAST(COALESCE(json_extract(data,'$.raisedAmount'),0) + ?1 AS INTEGER),
            '$.donorsCount',  CAST(COALESCE(json_extract(data,'$.donorsCount'),0) + 1 AS INTEGER)),
            updated_at = ?2
          WHERE collection='equipmentNeeds' AND id = ?3`,
      ).bind(donation.amount, now, donation.need_id),
      env.DB.prepare(
        "UPDATE donations SET status = 'succeeded', paid_at = ?1, provider_transaction_id = ?2 WHERE id = ?3 AND status <> 'succeeded'",
      ).bind(now, providerTxnId, ref),
      env.DB.prepare(
        `INSERT INTO transactions (id, type, line_of_business, payer_uid, ref_id, amount,
                                   currency, fees, platform_amount, net_amount, status,
                                   provider_transaction_id, metadata, created_at)
         VALUES (?1, ?2, 'donations', ?3, ?4, ?5, 'XOF', ?6, ?7, ?8, 'completed', ?9, ?10, ?11)`,
      ).bind(
        ref, tip > 0 ? "donation_tip" : "donation", donation.donor_uid, donation.need_id,
        total, fees, tip, donation.amount, providerTxnId,
        JSON.stringify({ source: "bictorys_webhook", donationId: ref }), now,
      ),
    ];

    // Reçu par email : en outbox, donc dans le MÊME lot atomique que
    // l'encaissement. Un reçu ne peut être perdu parce que Brevo a hoqueté.
    if (donation.donor_uid) {
      const donor = await env.DB.prepare("SELECT email FROM users WHERE uid = ?1")
        .bind(donation.donor_uid)
        .first<{ email: string | null }>();
      if (donor?.email) {
        statements.push(
          outboxInsert(env, "donation.receipt", {
            email: donor.email,
            amount: String(donation.amount),
            tip: String(tip),
          }),
        );
      }
    }

    try {
      await env.DB.batch(statements);
    } catch {
      return new Response("ok"); // violation du verrou = rejeu, déjà traité
    }
    return new Response("ok");
  }

  // --- Chemin 2 : abonnement ou billet ---------------------------------------
  const pending = await env.DB.prepare(
    `SELECT id, kind, payer_uid, plan_id, org_id, facility_slug, event_id, quantity,
            commission_rate, amount, billing_period, status
       FROM pending_charges WHERE id = ?1`,
  )
    .bind(ref)
    .first<{
      id: string; kind: string; payer_uid: string; plan_id: string | null;
      org_id: string | null; facility_slug: string | null; event_id: string | null;
      quantity: number | null; commission_rate: number | null; amount: number;
      billing_period: string | null; status: string;
    }>();

  if (!pending) return new Response("unknown reference", { status: 404 });
  if (!paid) {
    if (event.status) {
      await env.DB.prepare("UPDATE pending_charges SET status = ?1, updated_at = ?2 WHERE id = ?3")
        .bind(event.status, now, ref)
        .run();
    }
    return new Response("ok");
  }
  if (pending.status === "succeeded") return new Response("ok");

  const fees = Math.round(pending.amount * FEE_RATE);
  const settle = env.DB.prepare(
    "UPDATE pending_charges SET status = 'succeeded', updated_at = ?1 WHERE id = ?2",
  ).bind(now, ref);

  if (pending.kind === "subscription" && (pending.org_id || pending.facility_slug)) {
    const periodDays = pending.billing_period === "yearly" ? 365 : 30;
    const tier = pending.plan_id?.includes("pro") ? "pro" : "verified";
    const targetId = (pending.facility_slug ?? pending.org_id) as string;

    // Un abonnement par cible : l'identifiant du document EST celui de la cible.
    const existing = await env.DB.prepare(
      "SELECT current_period_end FROM subscriptions WHERE id = ?1",
    )
      .bind(targetId)
      .first<{ current_period_end: string }>();

    const prevEnd = existing ? Date.parse(existing.current_period_end) : NaN;
    const from = Number.isFinite(prevEnd) && prevEnd > now ? prevEnd : now;
    const newEnd = new Date(from + periodDays * DAY_MS).toISOString();

    const targetUpdate = pending.facility_slug
      ? env.DB.prepare(
          `UPDATE documents SET data = json_set(data,
             '$.planTier', ?1, '$.planId', ?2, '$.featured', json(?3), '$.subscribedUntil', ?4),
             updated_at = ?5
           WHERE collection='facilities' AND id = ?6`,
        ).bind(tier, pending.plan_id, tier === "pro" ? "true" : "false", newEnd, now, targetId)
      : env.DB.prepare(
          `UPDATE organizations SET plan_tier = ?1, plan_id = ?2, featured = ?3,
                                    subscribed_until = ?4, updated_at = ?5
            WHERE id = ?6`,
        ).bind(tier, pending.plan_id, tier === "pro" ? 1 : 0, newEnd, now, targetId);

    try {
      await env.DB.batch([
        lock,
        env.DB.prepare(
          `INSERT INTO subscriptions (id, subscriber_uid, org_id, facility_slug, plan_id, status,
                                      current_period_start, current_period_end, cancel_at_period_end,
                                      renewal_reminded, provider, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?7, 0, 0, 'bictorys', ?8, ?8)
           ON CONFLICT(id) DO UPDATE SET
             plan_id = excluded.plan_id, status = 'active',
             current_period_start = excluded.current_period_start,
             current_period_end = excluded.current_period_end,
             renewal_reminded = 0, updated_at = excluded.updated_at`,
        ).bind(
          targetId, pending.payer_uid, pending.org_id, pending.facility_slug, pending.plan_id,
          new Date(now).toISOString(), newEnd, now,
        ),
        targetUpdate,
        env.DB.prepare(
          `INSERT INTO transactions (id, type, line_of_business, payer_uid, ref_id, amount,
                                     currency, fees, platform_amount, net_amount, status,
                                     provider_transaction_id, metadata, created_at)
           VALUES (?1, 'subscription', 'pages', ?2, ?3, ?4, 'XOF', ?5, ?6, 0, 'completed', ?7, ?8, ?9)`,
        ).bind(
          ref, pending.payer_uid, targetId, pending.amount, fees, pending.amount - fees,
          providerTxnId,
          JSON.stringify({ source: "bictorys_webhook", kind: "subscription", planId: pending.plan_id }),
          now,
        ),
        settle,
      ]);
    } catch {
      return new Response("ok");
    }
    return new Response("ok");
  }

  if (pending.kind === "ticket" && pending.event_id) {
    const rate = pending.commission_rate ?? 0.09;
    const commission = Math.round(pending.amount * rate);
    const qty = pending.quantity ?? 1;

    try {
      await env.DB.batch([
        lock,
        env.DB.prepare(
          // Même précaution : un nombre de places doit rester entier.
          `UPDATE documents SET data = json_set(data, '$.seatsLeft',
              CAST(COALESCE(json_extract(data,'$.seatsLeft'),0) - ?1 AS INTEGER)), updated_at = ?2
            WHERE collection='events' AND id = ?3`,
        ).bind(qty, now, pending.event_id),
        env.DB.prepare(
          `INSERT INTO tickets (id, event_id, buyer_uid, quantity, amount, status, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, 'valid', ?6)`,
        ).bind(ref, pending.event_id, pending.payer_uid, qty, pending.amount, now),
        env.DB.prepare(
          `INSERT INTO transactions (id, type, line_of_business, payer_uid, ref_id, amount,
                                     currency, fees, platform_amount, net_amount, status,
                                     provider_transaction_id, metadata, created_at)
           VALUES (?1, 'ticket', 'events', ?2, ?3, ?4, 'XOF', ?5, ?6, ?7, 'completed', ?8, ?9, ?10)`,
        ).bind(
          ref, pending.payer_uid, pending.event_id, pending.amount, fees, commission,
          pending.amount - commission - fees, providerTxnId,
          JSON.stringify({ source: "bictorys_webhook", kind: "ticket", eventId: pending.event_id }),
          now,
        ),
        env.DB.prepare(
          `INSERT INTO commissions (id, transaction_id, beneficiary_uid, gross_amount,
                                    commission_rate, commission_amount, net_amount,
                                    payout_status, created_at)
           VALUES (?1, ?1, '', ?2, ?3, ?4, ?5, 'pending', ?6)`,
        ).bind(ref, pending.amount, rate, commission, pending.amount - commission, now),
        settle,
      ]);
    } catch {
      return new Response("ok");
    }
    return new Response("ok");
  }

  return new Response("ok");
}

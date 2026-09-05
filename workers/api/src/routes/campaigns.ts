/**
 * Campagnes de prévention ciblées (SMS / WhatsApp).
 *
 * TROIS CHANGEMENTS PAR RAPPORT À LA CLOUD FUNCTION
 *
 * 1. Ciblage. L'originale chargeait TOUS les utilisateurs (limite 2000) et
 *    filtrait les centres d'intérêt en mémoire. La table `user_interests`
 *    normalisée en fait un WHERE indexé.
 * 2. Quota. Une `runTransaction` réservait le quota mensuel ; D1 n'a pas de
 *    transaction interactive, mais n'en a pas besoin : une seule instruction
 *    UPDATE conditionnelle, puis lecture de `meta.changes` — 0 signifie quota
 *    atteint. C'est atomique par construction.
 * 3. Envoi. La boucle de 500 destinataires × 3 appels Chatwoot séquentiels
 *    bloquait le client plusieurs minutes. Elle passe en Queue.
 *
 * ⚠️ SEUL CHANGEMENT DE CONTRAT DES 13 FONCTIONS : la réponse renvoie `queued`
 * et non `sent`, puisque le nombre d'envois réussis n'est pas connu à la
 * réponse. L'UI rafraîchit `sentCount`, incrémenté par le consommateur.
 */
import type { Env } from "../auth/context";
import { ApiError, json } from "../lib/http";
import type { Ctx } from "../policy/types";

const MAX_RECIPIENTS = 500;
const DEFAULT_QUOTA = 1000;

interface CampaignInput {
  title?: string;
  channel?: string;
  message?: string;
  tenantSlug?: string;
  segment?: { interest?: string; region?: string; communitySlug?: string };
}

export async function sendCampaign(
  env: Env,
  ctx: Ctx,
  request: Request,
  waitUntil: (p: Promise<unknown>) => void,
): Promise<Response> {
  if (!ctx.actor) throw new ApiError("unauthenticated", "Authentification requise.");
  const isAdmin = ctx.actor.role === "admin" || ctx.actor.role === "super_admin";

  const input = (await request.json()) as CampaignInput;
  const title = (input.title ?? "").trim();
  const message = (input.message ?? "").trim();
  const channel = input.channel ?? "";
  if (!title || !message) throw new ApiError("invalid-argument", "Titre et message requis.");
  if (channel !== "sms" && channel !== "whatsapp") {
    throw new ApiError("invalid-argument", "Canal invalide.");
  }

  const tenantSlug = input.tenantSlug ?? null;
  if (!isAdmin) {
    if (!tenantSlug) throw new ApiError("permission-denied", "Espace partenaire requis.");
    if (!ctx.managedTenants.has(tenantSlug)) {
      throw new ApiError("permission-denied", "Espace partenaire non géré.");
    }
  }

  // --- Audience : un WHERE indexé, plus un balayage en mémoire -------------
  const segment = input.segment ?? {};
  const clauses = ["(u.sms_consent = 1 OR u.whatsapp_consent = 1)", "u.phone IS NOT NULL"];
  const params: unknown[] = [];
  if (segment.interest) {
    clauses.push("EXISTS (SELECT 1 FROM user_interests i WHERE i.uid = u.uid AND i.interest = ?)");
    params.push(segment.interest);
  }
  if (segment.region) {
    clauses.push("u.region = ?");
    params.push(segment.region);
  }

  const { results: audience } = await env.DB.prepare(
    `SELECT u.uid, u.phone, u.display_name, u.email FROM users u
      WHERE ${clauses.join(" AND ")} LIMIT ${MAX_RECIPIENTS}`,
  )
    .bind(...params)
    .all<{ uid: string; phone: string; display_name: string | null; email: string | null }>();

  const recipients = audience ?? [];
  if (recipients.length === 0) {
    throw new ApiError("failed-precondition", "Aucun destinataire ne correspond au segment.");
  }

  // --- Quota : une instruction conditionnelle, pas une transaction ---------
  if (tenantSlug) {
    const periodKey = new Date().toISOString().slice(0, 7); // AAAA-MM
    const reservation = await env.DB.prepare(
      `UPDATE tenant_quotas SET
         campaign_sent = (CASE WHEN campaign_period_key = ?1 THEN campaign_sent ELSE 0 END) + ?2,
         campaign_period_key = ?1,
         updated_at = ?3
       WHERE tenant_slug = ?4
         AND (CASE WHEN campaign_period_key = ?1 THEN campaign_sent ELSE 0 END) + ?2
             <= COALESCE(campaign_monthly, ${DEFAULT_QUOTA})`,
    )
      .bind(periodKey, recipients.length, Date.now(), tenantSlug)
      .run();

    if (reservation.meta.changes === 0) {
      // Message repris à l'identique : il est affiché tel quel dans l'UI partenaire.
      const quota = await env.DB.prepare(
        "SELECT campaign_monthly FROM tenant_quotas WHERE tenant_slug = ?1",
      )
        .bind(tenantSlug)
        .first<{ campaign_monthly: number }>();
      throw new ApiError(
        "resource-exhausted",
        `Quota mensuel de campagnes atteint (${quota?.campaign_monthly ?? DEFAULT_QUOTA} messages).`,
      );
    }
  }

  const campaignId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO campaigns (id, tenant_slug, title, channel, message, segment, status,
                            targeted_count, sent_count, created_by_uid, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'sent', ?7, 0, ?8, ?9)`,
  )
    .bind(
      campaignId, tenantSlug, title, channel, message, JSON.stringify(segment),
      recipients.length, ctx.actor.uid, Date.now(),
    )
    .run();

  // --- Diffusion : en file, jamais dans la requête -------------------------
  const messages = recipients.map((r) => ({
    body: {
      kind: "campaign.recipient" as const,
      campaignId,
      uid: r.uid,
      name: r.display_name ?? r.phone,
      email: r.email ?? "",
      text: message,
    },
  }));
  if (env.TASKS) {
    waitUntil(env.TASKS.sendBatch(messages));
  }

  return json({ campaignId, targeted: recipients.length, queued: recipients.length });
}

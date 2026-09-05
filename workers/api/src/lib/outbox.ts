/**
 * Outbox transactionnel — remplaçant des triggers Firestore.
 *
 * Cloudflare n'a pas de déclencheur de base de données, et ce n'est pas une
 * lacune à contourner : les triggers `onNewsletterSignup` / `onSupportIntent`
 * n'existaient que parce que le NAVIGATEUR écrivait directement dans Firestore.
 * Une fois l'écriture passée par le Worker, « ce qui se produit après » n'est
 * que la suite du handler.
 *
 * Reste à ne rien perdre. Un simple `queue.send()` après le commit peut échouer,
 * ou l'isolat mourir entre les deux. La ligne d'outbox est donc écrite dans le
 * MÊME lot atomique que la donnée ; un balayage périodique rattrape ce qui n'est
 * pas parti. C'est exactement la garantie « au moins une fois » que
 * `onDocumentCreated` offrait gratuitement.
 */
import type { Env } from "../auth/context";
import { sendEmail } from "../integrations/brevo";
import { pushToChatwoot } from "../integrations/chatwoot";
import { donationReceiptHtml, newsletterWelcomeHtml, supportIntentHtml } from "../templates/emails";

export type OutboxTopic = "newsletter.welcome" | "support.intent" | "donation.receipt";

export interface OutboxRow {
  id: string;
  topic: OutboxTopic;
  payload: string;
  attempts: number;
}

/** Instruction d'insertion, à joindre au lot d'écriture métier. */
export function outboxInsert(env: Env, topic: OutboxTopic, payload: unknown) {
  return env.DB.prepare(
    "INSERT INTO outbox (id, topic, payload, created_at) VALUES (?1, ?2, ?3, ?4)",
  ).bind(crypto.randomUUID(), topic, JSON.stringify(payload), Date.now());
}

async function dispatch(env: Env, row: OutboxRow): Promise<void> {
  const payload = JSON.parse(row.payload) as Record<string, string>;
  const chatwoot = {
    baseUrl: env.CHATWOOT_BASE_URL ?? "",
    accountId: env.CHATWOOT_ACCOUNT_ID ?? "",
    inboxId: env.CHATWOOT_WEBSITE_INBOX_ID ?? "",
    apiToken: env.CHATWOOT_API_TOKEN,
  };

  if (row.topic === "newsletter.welcome") {
    // Les deux effets sont indépendants : l'échec de l'un ne doit pas priver
    // l'utilisateur de l'autre.
    await Promise.allSettled([
      pushToChatwoot(
        { name: payload.email, email: payload.email, message: `Inscription newsletter (${payload.source ?? "site"})` },
        chatwoot,
      ),
      sendEmail(
        { to: payload.email, subject: "Bienvenue sur Wergu Yaram", html: newsletterWelcomeHtml() },
        env.BREVO_API_KEY,
        env.BREVO_SENDER ?? "Wergu Yaram <no-reply@werguyaram.org>",
      ),
    ]);
    return;
  }

  if (row.topic === "donation.receipt") {
    await sendEmail(
      {
        to: payload.email,
        subject: "Reçu de votre don — Wergu Yaram",
        html: donationReceiptHtml(Number(payload.amount), Number(payload.tip)),
      },
      env.BREVO_API_KEY,
      env.BREVO_SENDER ?? "Wergu Yaram <no-reply@werguyaram.org>",
    );
    return;
  }

  if (row.topic === "support.intent") {
    await Promise.allSettled([
      pushToChatwoot(
        {
          name: payload.email,
          email: payload.email,
          message: `Intention de soutien récurrent : ${payload.monthlyAmount} FCFA/mois`,
        },
        chatwoot,
      ),
      sendEmail(
        {
          to: payload.email,
          subject: "Merci pour votre intention de soutien",
          html: supportIntentHtml(Number(payload.monthlyAmount)),
        },
        env.BREVO_API_KEY,
        env.BREVO_SENDER ?? "Wergu Yaram <no-reply@werguyaram.org>",
      ),
    ]);
  }
}

/**
 * Traite les lignes en attente.
 *
 * Appelée en `waitUntil` après chaque écriture (livraison immédiate) ET par le
 * cron quotidien (filet de rattrapage). Bornée pour ne jamais dépasser le budget
 * CPU d'une requête.
 */
export async function drainOutbox(env: Env, limit = 10): Promise<number> {
  const { results } = await env.DB.prepare(
    "SELECT id, topic, payload, attempts FROM outbox WHERE sent_at IS NULL AND attempts < 5 ORDER BY created_at LIMIT ?1",
  )
    .bind(limit)
    .all<OutboxRow>();

  let done = 0;
  for (const row of results ?? []) {
    try {
      await dispatch(env, row);
      await env.DB.prepare("UPDATE outbox SET sent_at = ?1 WHERE id = ?2")
        .bind(Date.now(), row.id)
        .run();
      done++;
    } catch (err) {
      await env.DB.prepare(
        "UPDATE outbox SET attempts = attempts + 1, last_error = ?1 WHERE id = ?2",
      )
        .bind(String((err as Error).message ?? err).slice(0, 500), row.id)
        .run();
    }
  }
  return done;
}

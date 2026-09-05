/**
 * Relance des abonnements arrivant à échéance — cron quotidien 09:00 UTC.
 *
 * ⚠️ Cloudflare n'a PAS de champ fuseau horaire sur les crons : tout est en UTC.
 * Dakar étant à UTC±0, 09:00 UTC est bien 09:00 local — mais il faut d'abord
 * vérifier ce que faisait réellement la Cloud Function, car
 * `onSchedule("every day 09:00")` SANS `timeZone` explicite s'exécute dans le
 * fuseau par défaut du projet, potentiellement America/Los_Angeles.
 *
 * Les dates restent en ISO-8601 : le code les stockait déjà ainsi, et l'ordre
 * lexicographique ISO coïncide avec l'ordre chronologique — la comparaison
 * fonctionne verbatim en SQLite.
 */
import type { Env } from "../auth/context";
import { sendEmail } from "../integrations/brevo";
import { subscriptionReminderHtml } from "../templates/emails";

export async function remindDueSubscriptions(env: Env): Promise<{ expired: number; reminded: number }> {
  const now = Date.now();
  const horizon = new Date(now + 7 * 24 * 3600 * 1000).toISOString();

  const { results } = await env.DB.prepare(
    `SELECT s.id, s.subscriber_uid, s.org_id, s.facility_slug, s.current_period_end,
            s.renewal_reminded, u.email
       FROM subscriptions s
       LEFT JOIN users u ON u.uid = s.subscriber_uid
      WHERE s.status = 'active' AND s.current_period_end <= ?1`,
  )
    .bind(horizon)
    .all<{
      id: string;
      subscriber_uid: string;
      org_id: string | null;
      facility_slug: string | null;
      current_period_end: string;
      renewal_reminded: number;
      email: string | null;
    }>();

  let expired = 0;
  let reminded = 0;

  for (const sub of results ?? []) {
    const endMs = Date.parse(sub.current_period_end);

    if (endMs < now) {
      // Échu : on retire l'entitlement. `FieldValue.delete()` devient un NULL.
      const statements = [
        env.DB.prepare("UPDATE subscriptions SET status = 'past_due', updated_at = ?1 WHERE id = ?2")
          .bind(now, sub.id),
      ];
      if (sub.org_id) {
        statements.push(
          env.DB.prepare(
            "UPDATE organizations SET plan_tier = NULL, featured = 0, updated_at = ?1 WHERE id = ?2",
          ).bind(now, sub.org_id),
        );
      } else if (sub.facility_slug) {
        statements.push(
          env.DB.prepare(
            `UPDATE documents SET data = json_remove(json_set(data, '$.featured', json('false')), '$.planTier'),
                    updated_at = ?1
              WHERE collection = 'facilities' AND id = ?2`,
          ).bind(now, sub.facility_slug),
        );
      }
      await env.DB.batch(statements);
      expired++;
      continue;
    }

    if (sub.renewal_reminded === 1 || !sub.email) continue;

    await sendEmail(
      {
        to: sub.email,
        subject: "Votre abonnement Wergu Yaram arrive à échéance",
        html: subscriptionReminderHtml(sub.current_period_end),
      },
      env.BREVO_API_KEY,
      env.BREVO_SENDER ?? "Wergu Yaram <no-reply@werguyaram.org>",
    );
    await env.DB.prepare("UPDATE subscriptions SET renewal_reminded = 1 WHERE id = ?1")
      .bind(sub.id)
      .run();
    reminded++;
  }

  return { expired, reminded };
}

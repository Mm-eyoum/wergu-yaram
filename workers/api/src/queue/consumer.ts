/**
 * Consommateur de la file — diffusion des campagnes.
 *
 * `max_concurrency = 2` dans wrangler.toml : Chatwoot est mutualisé et une
 * campagne de 500 destinataires le saturerait à pleine parallélisation.
 */
import type { Env } from "../auth/context";
import { pushToChatwoot } from "../integrations/chatwoot";

export interface CampaignTask {
  kind: "campaign.recipient";
  campaignId: string;
  uid: string;
  name: string;
  email: string;
  text: string;
}

export async function handleQueue(batch: MessageBatch<CampaignTask>, env: Env): Promise<void> {
  const cfg = {
    baseUrl: env.CHATWOOT_BASE_URL ?? "",
    accountId: env.CHATWOOT_ACCOUNT_ID ?? "",
    inboxId: env.CHATWOOT_WEBSITE_INBOX_ID ?? "",
    apiToken: env.CHATWOOT_API_TOKEN,
  };

  for (const msg of batch.messages) {
    const task = msg.body;
    if (task.kind !== "campaign.recipient") {
      msg.ack();
      continue;
    }
    try {
      await pushToChatwoot(
        { name: task.name, email: task.email, message: task.text, identifier: task.uid },
        cfg,
      );
      await env.DB.prepare("UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?1")
        .bind(task.campaignId)
        .run();
      msg.ack();
    } catch (err) {
      console.error("échec d'envoi de campagne", { campaignId: task.campaignId, err });
      msg.retry(); // épuisement des tentatives → file de rebut
    }
  }
}

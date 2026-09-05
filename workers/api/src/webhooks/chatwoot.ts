/**
 * Webhook Chatwoot → notification in-app.
 *
 * ⚠️ Chatwoot NE SIGNE PAS ses webhooks : l'authentification repose sur un jeton
 * partagé, comparé en temps constant. `crypto.subtle.timingSafeEqual` lève si
 * les longueurs diffèrent, d'où le contrôle de longueur préalable — exactement
 * la précaution que prenait la Cloud Function.
 */
import type { Env } from "../auth/context";
import { json } from "../lib/http";

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.byteLength !== bb.byteLength) return false;
  return crypto.subtle.timingSafeEqual(ba, bb);
}

export async function chatwootWebhook(env: Env, request: Request, url: URL): Promise<Response> {
  const expected = env.CHATWOOT_WEBHOOK_TOKEN;
  if (!expected) return new Response("Webhook non configuré.", { status: 503 });

  const provided = request.headers.get("x-webhook-token") ?? url.searchParams.get("token") ?? "";
  if (!constantTimeEqual(provided, expected)) {
    return new Response("Jeton invalide.", { status: 401 });
  }

  const event = (await request.json()) as {
    event?: string;
    message_type?: string;
    id?: number;
    content?: string;
    conversation?: { id?: number };
    contact?: { identifier?: string };
    meta?: { sender?: { identifier?: string } };
  };

  // Seuls les messages SORTANTS (agent → utilisateur) produisent une notification.
  if (event.event !== "message_created" || event.message_type !== "outgoing") {
    return json({ ignored: true });
  }

  const uid = event.contact?.identifier ?? event.meta?.sender?.identifier;
  if (!uid) return json({ ignored: true, reason: "identifiant absent" });

  // Identifiant déterministe : une redistribution du même message ne crée pas
  // de doublon (l'équivalent du `set(..., {merge:true})` d'origine).
  const id = `cw_${event.id ?? crypto.randomUUID()}`;
  await env.DB.prepare(
    `INSERT INTO user_notifications (uid, id, kind, title, body, meta, created_at)
     VALUES (?1, ?2, 'support_reply', 'Réponse du support', ?3, ?4, ?5)
     ON CONFLICT(uid, id) DO UPDATE SET body = excluded.body`,
  )
    .bind(
      uid,
      id,
      (event.content ?? "").slice(0, 280),
      JSON.stringify({ conversationId: event.conversation?.id ?? null }),
      Date.now(),
    )
    .run();

  return json({ ok: true });
}

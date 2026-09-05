/**
 * Messagerie — index en D1, temps réel en Durable Object.
 *
 * Les signatures exportées de src/services/messaging.ts sont préservées, si bien
 * que src/pages/Messages.tsx — seul consommateur — n'est pas modifié.
 */
import type { Env } from "../auth/context";
import { ApiError, json } from "../lib/http";
import type { Ctx } from "../policy/types";

const TICKET_TTL_S = 60;

function requireUser(ctx: Ctx) {
  if (!ctx.actor) throw new ApiError("unauthenticated", "Authentification requise.");
  if (ctx.actor.status === "suspended") throw new ApiError("permission-denied", "Compte suspendu.");
  return ctx.actor;
}

async function assertParticipant(env: Env, conversationId: string, uid: string): Promise<void> {
  const row = await env.DB.prepare(
    "SELECT 1 AS ok FROM conversation_participants WHERE conversation_id = ?1 AND uid = ?2",
  )
    .bind(conversationId, uid)
    .first<{ ok: number }>();
  if (!row) throw new ApiError("permission-denied", "Non participant.");
}

/**
 * Liste des conversations.
 *
 * C'est une requête ENTRE entités (« celles où je figure, triées par activité »),
 * donc une requête de base — pas quelque chose qu'un Durable Object isolé peut
 * répondre. Remplace `where("participants","array-contains",uid)` et son index
 * composite Firestore par une jointure indexée.
 */
export async function listConversations(env: Env, ctx: Ctx): Promise<Response> {
  const actor = requireUser(ctx);
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.title, c.last_message, c.last_sender_uid, c.updated_at,
            (SELECT group_concat(p2.uid) FROM conversation_participants p2
              WHERE p2.conversation_id = c.id) AS participants
       FROM conversations c
       JOIN conversation_participants p ON p.conversation_id = c.id AND p.uid = ?1
      ORDER BY c.updated_at DESC`,
  )
    .bind(actor.uid)
    .all<{
      id: string;
      title: string | null;
      last_message: string | null;
      last_sender_uid: string | null;
      updated_at: number;
      participants: string | null;
    }>();

  return json({
    items: (results ?? []).map((r) => ({
      id: r.id,
      participants: (r.participants ?? "").split(",").filter(Boolean),
      name: r.title ?? "Conversation",
      lastMessage: r.last_message ?? "",
      lastSenderUid: r.last_sender_uid ?? undefined,
      updatedAt: { __ts: r.updated_at },
    })),
  });
}

/** Fil de support, idempotent : l'identifiant déterministe évite les doublons. */
export async function ensureSupportConversation(env: Env, ctx: Ctx): Promise<Response> {
  const actor = requireUser(ctx);
  const id = `support_${actor.uid}`;
  const now = Date.now();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO conversations (id, kind, title, last_message, created_at, updated_at)
       VALUES (?1, 'support', 'Support Wergu Yaram', '', ?2, ?2)
       ON CONFLICT(id) DO NOTHING`,
    ).bind(id, now),
    env.DB.prepare(
      "INSERT OR IGNORE INTO conversation_participants (conversation_id, uid, joined_at) VALUES (?1, ?2, ?3)",
    ).bind(id, actor.uid, now),
    env.DB.prepare(
      "INSERT OR IGNORE INTO conversation_participants (conversation_id, uid, joined_at) VALUES (?1, 'support', ?2)",
    ).bind(id, now),
  ]);

  return json({ id });
}

/**
 * Historique. Sert aussi de repli en polling quand l'upgrade WebSocket échoue —
 * fréquent derrière certains proxys mobiles au Sénégal.
 */
export async function listMessages(
  env: Env,
  ctx: Ctx,
  conversationId: string,
  url: URL,
): Promise<Response> {
  const actor = requireUser(ctx);
  await assertParticipant(env, conversationId, actor.uid);

  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);
  const since = Number(url.searchParams.get("since") ?? 0) || 0;

  const { results } = await env.DB.prepare(
    `SELECT id, sender_uid, text, created_at FROM messages
      WHERE conversation_id = ?1 AND created_at > ?2
      ORDER BY created_at DESC LIMIT ?3`,
  )
    .bind(conversationId, since, limit)
    .all<{ id: string; sender_uid: string; text: string; created_at: number }>();

  // Requête en ordre décroissant (pour borner), rendu en ordre croissant —
  // exactement ce que faisait `subscribeMessages` avec son `.reverse()`.
  return json({
    items: (results ?? [])
      .map((r) => ({
        id: r.id,
        senderUid: r.sender_uid,
        text: r.text,
        createdAt: { __ts: r.created_at },
      }))
      .reverse(),
  });
}

/** Envoi hors WebSocket — le DO reste l'écrivain unique, donc l'ordre tient. */
export async function postMessage(
  env: Env,
  ctx: Ctx,
  conversationId: string,
  request: Request,
): Promise<Response> {
  const actor = requireUser(ctx);
  await assertParticipant(env, conversationId, actor.uid);

  const body = (await request.json()) as { text?: string };
  const text = (body.text ?? "").trim();
  if (text.length < 1 || text.length > 5000) {
    throw new ApiError("invalid-argument", "Le message doit faire entre 1 et 5000 caractères.");
  }

  const stub = env.CONVERSATION.get(env.CONVERSATION.idFromName(conversationId));
  const message = await stub.append(conversationId, actor.uid, text);
  return json({ ...message, createdAt: { __ts: message.createdAt } }, { status: 201 });
}

// --- Authentification du socket ---------------------------------------------

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Ticket d'ouverture de socket, valable 60 s et à usage unique.
 *
 * ⚠️ Un navigateur ne peut PAS poser d'en-tête `Authorization` sur un handshake
 * WebSocket, et mettre un jeton Firebase (valable 1 h) dans l'URL le ferait
 * fuir dans les journaux et les en-têtes `Referer`. D'où ce ticket court,
 * brûlé à la première utilisation.
 */
export async function issueWsTicket(env: Env, ctx: Ctx, conversationId: string): Promise<Response> {
  const actor = requireUser(ctx);
  await assertParticipant(env, conversationId, actor.uid);

  const secret = env.WS_TICKET_SECRET ?? env.IMPACT_KEY_PEPPER;
  if (!secret) throw new ApiError("unavailable", "Signature de ticket non configurée.");

  const exp = Date.now() + TICKET_TTL_S * 1000;
  const nonce = crypto.randomUUID();
  const ticket = `${nonce}.${await hmac(secret, `${actor.uid}:${conversationId}:${exp}:${nonce}`)}`;

  await env.CACHE.put(
    `ws:${ticket}`,
    JSON.stringify({ uid: actor.uid, conversationId, exp }),
    { expirationTtl: TICKET_TTL_S },
  );

  return json({ ticket, expiresAt: exp });
}

export async function openSocket(
  env: Env,
  conversationId: string,
  url: URL,
  request: Request,
): Promise<Response> {
  const ticket = url.searchParams.get("ticket");
  if (!ticket) throw new ApiError("unauthenticated", "Ticket manquant.");

  const raw = await env.CACHE.get(`ws:${ticket}`);
  if (!raw) throw new ApiError("unauthenticated", "Ticket invalide ou expiré.");
  await env.CACHE.delete(`ws:${ticket}`); // usage unique

  const claim = JSON.parse(raw) as { uid: string; conversationId: string; exp: number };
  if (claim.conversationId !== conversationId || claim.exp < Date.now()) {
    throw new ApiError("unauthenticated", "Ticket invalide.");
  }

  const stub = env.CONVERSATION.get(env.CONVERSATION.idFromName(conversationId));
  const target = new URL(request.url);
  target.searchParams.set("uid", claim.uid);
  target.searchParams.set("conversationId", conversationId);
  return stub.fetch(new Request(target, request));
}

// --- Marqueurs de lecture ----------------------------------------------------

/**
 * Ces marqueurs ne sont écrits QUE par leur propriétaire et lus QUE par lui :
 * un abonnement temps réel n'apportait rien. Une lecture unique suffit — un
 * listener supprimé sans perte de fonctionnalité.
 */
export async function listConversationReads(env: Env, ctx: Ctx): Promise<Response> {
  const actor = requireUser(ctx);
  const { results } = await env.DB.prepare(
    "SELECT conversation_id, last_read_at FROM user_conversation_reads WHERE uid = ?1",
  )
    .bind(actor.uid)
    .all<{ conversation_id: string; last_read_at: number }>();

  const reads: Record<string, string> = {};
  for (const r of results ?? []) reads[r.conversation_id] = new Date(r.last_read_at).toISOString();
  return json({ reads });
}

export async function markConversationRead(
  env: Env,
  ctx: Ctx,
  conversationId: string,
): Promise<Response> {
  const actor = requireUser(ctx);
  await env.DB.prepare(
    `INSERT INTO user_conversation_reads (uid, conversation_id, last_read_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(uid, conversation_id) DO UPDATE SET last_read_at = excluded.last_read_at`,
  )
    .bind(actor.uid, conversationId, Date.now())
    .run();
  return json({ ok: true });
}

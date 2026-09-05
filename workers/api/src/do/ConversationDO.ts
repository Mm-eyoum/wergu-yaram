/**
 * Durable Object d'une conversation — remplaçant du temps réel Firestore.
 *
 * POURQUOI UN DO, ET UN SEUL
 * Sur les quatre `onSnapshot` du code, trois concernent la messagerie et un
 * était du code mort. Le DO n'apporte ici que deux choses, mais elles sont
 * irremplaçables : la SÉRIALISATION des écritures (l'ordre des messages est un
 * invariant réel) et la DIFFUSION aux participants d'un même fil.
 *
 * POURQUOI PAR CONVERSATION, PAS PAR UTILISATEUR
 * Une boîte de réception par utilisateur exigerait une écriture inter-objets à
 * chaque message, et ne saurait toujours pas répondre à « lister mes
 * conversations » sans un index. Le fil est la frontière naturelle.
 *
 * POURQUOI D1 RESTE L'INDEX
 * « Mes conversations triées par date » est une requête ENTRE entités : c'est
 * une requête de base, pas une question qu'un objet isolé peut trancher. Le DO
 * écrit donc EN TRAVERSÉE vers D1 — le journal complet y vit, rien n'est
 * prisonnier de l'objet, et l'historique reste interrogeable normalement.
 */

import { DurableObject } from "cloudflare:workers";

interface DoEnv {
  DB: D1Database;
}

interface Attachment {
  uid: string;
}

interface OutgoingMessage {
  id: string;
  senderUid: string;
  text: string;
  createdAt: number;
}

/** Fenêtre chaude conservée localement ; D1 garde le journal complet. */
const HOT_WINDOW = 200;
const MAX_TEXT = 5000;

export class ConversationDO extends DurableObject<DoEnv> {
  private participants: string[] | null = null;

  constructor(ctx: DurableObjectState, env: DoEnv) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS msg (
          id         TEXT PRIMARY KEY,
          sender_uid TEXT NOT NULL,
          text       TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
      // Un tab inactif ne doit jamais réveiller l'objet : le ping/pong est
      // traité par le runtime, sans facturer de durée.
      this.ctx.setWebSocketAutoResponse(
        new WebSocketRequestResponsePair(JSON.stringify({ t: "ping" }), JSON.stringify({ t: "pong" })),
      );
    });
  }

  /** Participants du fil, lus une fois depuis D1 puis mémorisés. */
  private async loadParticipants(conversationId: string): Promise<string[]> {
    if (this.participants) return this.participants;
    const { results } = await this.env.DB.prepare(
      "SELECT uid FROM conversation_participants WHERE conversation_id = ?1",
    )
      .bind(conversationId)
      .all<{ uid: string }>();
    this.participants = (results ?? []).map((r) => r.uid);
    return this.participants;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId") ?? "";
    const uid = url.searchParams.get("uid") ?? "";

    if (request.headers.get("upgrade") !== "websocket") {
      return new Response("Attendu : une connexion WebSocket.", { status: 426 });
    }

    const participants = await this.loadParticipants(conversationId);
    if (!participants.includes(uid)) {
      return new Response("Non participant.", { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // ⚠️ `acceptWebSocket`, JAMAIS `server.accept()` : c'est ce qui autorise
    // l'hibernation. Sans cela, l'objet resterait en mémoire — et facturé —
    // tant qu'un onglet est ouvert.
    this.ctx.acceptWebSocket(server, [uid]);
    server.serializeAttachment({ uid } satisfies Attachment);

    // Rattrapage : la fenêtre chaude part immédiatement, sans toucher D1.
    const backlog = this.readHotWindow();
    server.send(JSON.stringify({ t: "backlog", messages: backlog }));

    return new Response(null, { status: 101, webSocket: client });
  }

  private readHotWindow(): OutgoingMessage[] {
    const rows = this.ctx.storage.sql
      .exec<{ id: string; sender_uid: string; text: string; created_at: number }>(
        "SELECT id, sender_uid, text, created_at FROM msg ORDER BY created_at DESC LIMIT ?",
        HOT_WINDOW,
      )
      .toArray();
    return rows
      .map((r) => ({ id: r.id, senderUid: r.sender_uid, text: r.text, createdAt: r.created_at }))
      .reverse();
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string") return;
    const attachment = ws.deserializeAttachment() as Attachment | null;
    if (!attachment?.uid) return;

    let payload: { t?: string; conversationId?: string; text?: string };
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      return;
    }
    if (payload.t !== "send") return;

    const conversationId = payload.conversationId ?? "";
    const text = (payload.text ?? "").trim();

    // Portage des règles Firestore L350-354 : participant, expéditeur = soi,
    // texte borné. Revalidé ICI parce qu'un socket vit plus longtemps qu'une
    // requête : les droits ont pu changer depuis le handshake.
    const participants = await this.loadParticipants(conversationId);
    if (!participants.includes(attachment.uid)) return;
    if (text.length < 1 || text.length > MAX_TEXT) {
      ws.send(JSON.stringify({ t: "error", message: "Message vide ou trop long." }));
      return;
    }

    await this.append(conversationId, attachment.uid, text);
  }

  /** Écrit le message : fenêtre chaude locale, journal D1, puis diffusion. */
  async append(conversationId: string, senderUid: string, text: string): Promise<OutgoingMessage> {
    const message: OutgoingMessage = {
      id: crypto.randomUUID(),
      senderUid,
      text,
      createdAt: Date.now(),
    };

    this.ctx.storage.sql.exec(
      "INSERT INTO msg (id, sender_uid, text, created_at) VALUES (?, ?, ?, ?)",
      message.id,
      message.senderUid,
      message.text,
      message.createdAt,
    );

    // Traversée vers D1 : journal complet + entête de conversation, dans un
    // lot atomique. Le DO étant l'écrivain unique, les deux ne peuvent diverger.
    await this.env.DB.batch([
      this.env.DB.prepare(
        "INSERT INTO messages (id, conversation_id, sender_uid, text, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
      ).bind(message.id, conversationId, senderUid, text, message.createdAt),
      this.env.DB.prepare(
        "UPDATE conversations SET last_message = ?1, last_sender_uid = ?2, updated_at = ?3 WHERE id = ?4",
      ).bind(text, senderUid, message.createdAt, conversationId),
    ]);

    const frame = JSON.stringify({ t: "message", message });
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(frame);
      } catch {
        // Socket mourant : le runtime le nettoiera.
      }
    }

    await this.ctx.storage.setAlarm(Date.now() + 60_000);
    return message;
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    // 1006 = fermeture anormale ; ne pas la renvoyer, le runtime la refuse.
    try {
      ws.close(code === 1006 ? 1000 : code);
    } catch {
      /* déjà fermé */
    }
  }

  /** Élagage de la fenêtre chaude. D1 conserve l'intégralité du journal. */
  async alarm(): Promise<void> {
    this.ctx.storage.sql.exec(
      `DELETE FROM msg WHERE id NOT IN (
         SELECT id FROM msg ORDER BY created_at DESC LIMIT ?
       )`,
      HOT_WINDOW,
    );
  }
}

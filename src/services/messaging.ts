import {
  addDoc,
  collection,
  doc,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { apiGet, apiPost } from "./apiClient";
import { usesD1 } from "./dbRouting";
import { validateText } from "@/lib/validation";
import type { AppUser } from "@/types/domain";

/**
 * Transport temps réel — Durable Object en WebSocket.
 *
 * Les signatures exportées de ce module sont INCHANGÉES : src/pages/Messages.tsx,
 * seul consommateur, n'est pas modifié. Seul le transport change.
 *
 * Un repli en polling est prévu : l'upgrade WebSocket échoue régulièrement
 * derrière certains proxys mobiles et réseaux d'entreprise au Sénégal, et une
 * messagerie qui ne se connecte pas vaut moins qu'une messagerie qui rafraîchit
 * toutes les 5 secondes.
 */
const POLL_MS = 5000;
const D1_MESSAGING = () => usesD1("conversations");

interface ApiMessage {
  id: string;
  senderUid: string;
  text: string;
  createdAt?: { __ts: number };
}

function tsToIso(v: { __ts: number } | undefined): string | undefined {
  return v ? new Date(v.__ts).toISOString() : undefined;
}

/**
 * Flux de messages : WebSocket si possible, polling sinon.
 * Renvoie une fonction de désabonnement, comme `onSnapshot`.
 */
function streamMessages(
  conversationId: string,
  uid: string,
  onData: (rows: LiveMessage[]) => void,
  onError?: (e: Error) => void,
  pageSize = 50,
): () => void {
  let closed = false;
  let socket: WebSocket | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  const buffer = new Map<string, LiveMessage>();

  const emit = () => {
    const rows = [...buffer.values()].sort((a, b) =>
      (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
    );
    onData(rows.slice(-pageSize));
  };
  const absorb = (rows: ApiMessage[]) => {
    for (const m of rows) {
      buffer.set(m.id, {
        id: m.id,
        senderUid: m.senderUid,
        text: m.text,
        createdAt: tsToIso(m.createdAt),
        fromMe: m.senderUid === uid,
      });
    }
    emit();
  };

  const startPolling = () => {
    if (closed || pollTimer) return;
    const tick = async () => {
      try {
        const body = await apiGet<{ items: ApiMessage[] }>(
          `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages?limit=${pageSize}`,
        );
        absorb(body.items);
      } catch (err) {
        onError?.(err as Error);
      }
    };
    void tick();
    pollTimer = setInterval(tick, POLL_MS);
  };

  void (async () => {
    try {
      const { ticket } = await apiPost<{ ticket: string }>(
        `/api/v1/conversations/${encodeURIComponent(conversationId)}/ws-ticket`,
        {},
      );
      if (closed) return;
      const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? window.location.origin;
      const wsUrl = `${base.replace(/^http/, "ws")}/api/v1/conversations/${encodeURIComponent(conversationId)}/ws?ticket=${encodeURIComponent(ticket)}`;
      socket = new WebSocket(wsUrl);

      socket.addEventListener("message", (event) => {
        const frame = JSON.parse(event.data as string) as
          | { t: "backlog"; messages: ApiMessage[] }
          | { t: "message"; message: ApiMessage }
          | { t: "error"; message: string }
          | { t: "pong" };
        if (frame.t === "backlog") absorb(frame.messages);
        else if (frame.t === "message") absorb([frame.message]);
        else if (frame.t === "error") onError?.(new Error(frame.message));
      });
      // Toute fermeture ou erreur bascule en polling : la messagerie continue.
      socket.addEventListener("error", startPolling);
      socket.addEventListener("close", () => {
        if (!closed) startPolling();
      });
    } catch {
      startPolling();
    }
  })();

  return () => {
    closed = true;
    if (pollTimer) clearInterval(pollTimer);
    try {
      socket?.close();
    } catch {
      /* déjà fermé */
    }
  };
}

/** A conversation thread (subset used by the UI). */
export interface LiveConversation {
  id: string;
  participants: string[];
  name: string;
  lastMessage: string;
  updatedAt?: string;
  /** Author of the most recent message — used to compute "unread" state. */
  lastSenderUid?: string;
}

export interface LiveMessage {
  id: string;
  senderUid: string;
  text: string;
  createdAt?: string;
  fromMe: boolean;
}

const SUPPORT_UID = "support";

function isoOf(value: unknown): string | undefined {
  return (value as { toDate?: () => Date } | undefined)?.toDate?.().toISOString();
}

/** Live list of the user's conversations (newest activity first). */
export function subscribeConversations(
  uid: string,
  onData: (rows: LiveConversation[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (D1_MESSAGING()) {
    // La liste est une requête ENTRE entités : elle reste en base, rafraîchie
    // par polling. Seul le contenu d'un fil justifie un socket.
    let stop = false;
    const tick = async () => {
      try {
        const body = await apiGet<{
          items: {
            id: string;
            participants: string[];
            name: string;
            lastMessage: string;
            lastSenderUid?: string;
            updatedAt?: { __ts: number };
          }[];
        }>("/api/v1/conversations");
        if (!stop) {
          onData(
            body.items.map((c) => ({
              id: c.id,
              participants: c.participants,
              name: c.name,
              lastMessage: c.lastMessage,
              updatedAt: tsToIso(c.updatedAt),
              lastSenderUid: c.lastSenderUid,
            })),
          );
        }
      } catch (e) {
        onError?.(e as Error);
      }
    };
    void tick();
    const timer = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }

  if (!db) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid),
    orderBy("updatedAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            participants: (data.participants as string[]) ?? [],
            name: (data.name as string) ?? "Conversation",
            lastMessage: (data.lastMessage as string) ?? "",
            updatedAt: isoOf(data.updatedAt),
            lastSenderUid: (data.lastSenderUid as string) ?? undefined,
          };
        }),
      ),
    (e) => onError?.(e),
  );
}

/** Default size of the live messages window. */
export const MESSAGES_PAGE_SIZE = 50;

/**
 * Live messages of a conversation (oldest first), bounded to the most recent
 * `pageSize` messages. The query reads newest-first with a `limit` (so a long
 * thread can never load thousands of docs / blow up memory or cost) and the
 * result is reversed to ascending for display. To load older history, grow
 * `pageSize` by a page and re-subscribe — the window simply widens.
 */
export function subscribeMessages(
  conversationId: string,
  uid: string,
  onData: (rows: LiveMessage[]) => void,
  onError?: (e: Error) => void,
  pageSize: number = MESSAGES_PAGE_SIZE,
): () => void {
  if (D1_MESSAGING()) return streamMessages(conversationId, uid, onData, onError, pageSize);

  if (!db) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "desc"),
    fbLimit(pageSize),
  );
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs
          .map((d) => {
            const data = d.data();
            const senderUid = (data.senderUid as string) ?? "";
            return {
              id: d.id,
              senderUid,
              text: (data.text as string) ?? "",
              createdAt: isoOf(data.createdAt),
              fromMe: senderUid === uid,
            };
          })
          .reverse(),
      ),
    (e) => onError?.(e),
  );
}

/** Send a message and bump the conversation's last-activity. */
export async function sendMessage(
  conversationId: string,
  fbUser: User,
  text: string,
): Promise<void> {
  const body = validateText("messageText", text, "Le message");

  if (D1_MESSAGING()) {
    // Passe par le DO, écrivain unique du fil : l'ordre des messages est un
    // invariant qu'aucune écriture concurrente ne peut casser.
    await apiPost(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
      text: body,
    });
    return;
  }

  if (!db) throw new Error("Firebase non configuré.");
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderUid: fbUser.uid,
    text: body,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: body,
    lastSenderUid: fbUser.uid,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Per-user read markers, stored under the owner's private subcollection
 * `users/{uid}/conversationReads/{conversationId}` (owner-only by rules). A
 * conversation is "unread" when its `updatedAt` is newer than the user's
 * marker AND the last message was sent by someone else.
 */
export function subscribeConversationReads(
  uid: string,
  onData: (reads: Record<string, string>) => void,
): () => void {
  if (D1_MESSAGING()) {
    // Ces marqueurs ne sont écrits QUE par leur propriétaire et lus QUE par lui :
    // un abonnement temps réel n'apportait rien. Une lecture unique suffit —
    // un listener supprimé sans perte de fonctionnalité.
    let stop = false;
    void apiGet<{ reads: Record<string, string> }>("/api/v1/me/conversation-reads")
      .then((b) => {
        if (!stop) onData(b.reads);
      })
      .catch(() => onData({}));
    return () => {
      stop = true;
    };
  }

  if (!db) {
    onData({});
    return () => {};
  }
  return onSnapshot(
    collection(db, "users", uid, "conversationReads"),
    (snap) => {
      const reads: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const at = isoOf(d.data().lastReadAt);
        if (at) reads[d.id] = at;
      });
      onData(reads);
    },
    () => onData({}),
  );
}

/** Mark a conversation as read up to now for the given user. */
export async function markConversationRead(uid: string, conversationId: string): Promise<void> {
  if (D1_MESSAGING()) {
    await apiPost(`/api/v1/conversations/${encodeURIComponent(conversationId)}/read`, {});
    return;
  }
  if (!db) return;
  await setDoc(
    doc(db, "users", uid, "conversationReads", conversationId),
    { lastReadAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Idempotently get/create the user's conversation with support.
 * Deterministic id (`support_{uid}`) avoids duplicates.
 */
export async function getOrCreateSupportConversation(
  fbUser: User,
  profile: AppUser,
): Promise<string> {
  if (D1_MESSAGING()) {
    const { id } = await apiPost<{ id: string }>("/api/v1/conversations", {});
    return id;
  }

  if (!db) throw new Error("Firebase non configuré.");
  const id = `support_${fbUser.uid}`;
  await setDoc(
    doc(db, "conversations", id),
    {
      participants: [fbUser.uid, SUPPORT_UID],
      name: "Support Wergu Yaram",
      startedBy: profile.uid,
      lastMessage: "",
      lastSenderUid: "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

import {
  addDoc,
  collection,
  doc,
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
import { validateText } from "@/lib/validation";
import type { AppUser } from "@/types/domain";

/** A conversation thread (subset used by the UI). */
export interface LiveConversation {
  id: string;
  participants: string[];
  name: string;
  lastMessage: string;
  updatedAt?: string;
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
          };
        }),
      ),
    (e) => onError?.(e),
  );
}

/** Live messages of a conversation (oldest first). */
export function subscribeMessages(
  conversationId: string,
  uid: string,
  onData: (rows: LiveMessage[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (!db) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs.map((d) => {
          const data = d.data();
          const senderUid = (data.senderUid as string) ?? "";
          return {
            id: d.id,
            senderUid,
            text: (data.text as string) ?? "",
            createdAt: isoOf(data.createdAt),
            fromMe: senderUid === uid,
          };
        }),
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
  if (!db) throw new Error("Firebase non configuré.");
  const body = validateText("messageText", text, "Le message");
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderUid: fbUser.uid,
    text: body,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: body,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Idempotently get/create the user's conversation with support.
 * Deterministic id (`support_{uid}`) avoids duplicates.
 */
export async function getOrCreateSupportConversation(
  fbUser: User,
  profile: AppUser,
): Promise<string> {
  if (!db) throw new Error("Firebase non configuré.");
  const id = `support_${fbUser.uid}`;
  await setDoc(
    doc(db, "conversations", id),
    {
      participants: [fbUser.uid, SUPPORT_UID],
      name: "Support Wergu Yaram",
      startedBy: profile.uid,
      lastMessage: "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

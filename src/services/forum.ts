import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { timeAgoLabel } from "./communityPosts";
import { validateText } from "@/lib/validation";
import type { AppUser, ForumKind, ForumThread } from "@/types/domain";

function toThread(id: string, data: Record<string, unknown>): ForumThread {
  const created = (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
  return {
    id,
    authorUid: data.authorUid as string | undefined,
    title: (data.title as string) ?? "",
    excerpt: (data.excerpt as string) ?? "",
    kind: (data.kind as ForumKind) ?? "question",
    author: (data.author as { name: string; role?: string }) ?? { name: "Membre" },
    timeAgo: created ? timeAgoLabel(created) : "à l'instant",
    tags: (data.tags as string[]) ?? [],
    answers: (data.answers as number) ?? 0,
    votes: (data.votes as number) ?? 0,
    views: (data.views as number) ?? 0,
    solved: (data.solved as boolean) ?? false,
  };
}

/** Real forum threads (newest first). */
export async function fetchForumThreads(): Promise<ForumThread[]> {
  if (!db) return [];
  const q = query(collection(db, "forumThreads"), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toThread(d.id, d.data()));
}

/** Create a thread. authorUid must match the signed-in user (Firestore rules). */
export async function createForumThread(
  fbUser: User,
  profile: AppUser,
  input: { title: string; excerpt: string; kind: ForumKind; tags?: string[] },
): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  const title = validateText("threadTitle", input.title, "Le titre");
  const excerpt = validateText("threadExcerpt", input.excerpt, "La description");
  await addDoc(collection(db, "forumThreads"), {
    authorUid: fbUser.uid,
    title,
    excerpt,
    kind: input.kind,
    author: { name: profile.displayName ?? "Membre" },
    tags: input.tags ?? [],
    answers: 0,
    votes: 0,
    views: 0,
    solved: false,
    createdAt: serverTimestamp(),
  });
}

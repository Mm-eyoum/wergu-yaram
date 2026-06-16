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
import { validateText } from "@/lib/validation";
import type { AppUser, CommunityPost } from "@/types/domain";

/** Compact "il y a …" label from a Date. */
export function timeAgoLabel(date: Date): string {
  const sec = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const units: [number, string][] = [
    [60, "s"],
    [60, "min"],
    [24, "h"],
    [7, "j"],
    [4.345, "sem"],
    [12, "mois"],
  ];
  let value = sec;
  let label = "s";
  for (const [factor, unit] of units) {
    if (value < factor) {
      label = unit;
      break;
    }
    value = Math.floor(value / factor);
    label = unit;
  }
  return `il y a ${value} ${label}`;
}

function toPost(id: string, data: Record<string, unknown>): CommunityPost {
  const created = (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
  return {
    id,
    authorUid: data.authorUid as string | undefined,
    author: (data.author as { name: string; role?: string }) ?? { name: "Membre" },
    timeAgo: created ? timeAgoLabel(created) : "à l'instant",
    content: (data.content as string) ?? "",
    tags: (data.tags as string[]) ?? undefined,
    likes: (data.likes as number) ?? 0,
    comments: (data.comments as number) ?? 0,
    shares: (data.shares as number) ?? 0,
  };
}

/** Real member posts for a community (newest first). */
export async function fetchCommunityPosts(slug: string): Promise<CommunityPost[]> {
  if (!db) return [];
  const q = query(
    collection(db, "communities", slug, "posts"),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPost(d.id, d.data()));
}

/** Publish a post. authorUid must match the signed-in user (Firestore rules). */
export async function createCommunityPost(
  fbUser: User,
  profile: AppUser,
  slug: string,
  input: { content: string; tags?: string[] },
): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  const content = validateText("postContent", input.content, "Le message");
  await addDoc(collection(db, "communities", slug, "posts"), {
    authorUid: fbUser.uid,
    author: { name: profile.displayName ?? "Membre" },
    content,
    tags: input.tags ?? [],
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: serverTimestamp(),
  });
}

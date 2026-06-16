import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ContentType } from "@/types/domain";

/**
 * Per-user dashboard data, all stored under `users/{uid}/…` subcollections
 * (owner-only by Firestore rules). These power the real Dashboard.
 */

export interface Favorite {
  id: string;
  type: ContentType;
  refId: string;
  title: string;
  href: string;
  createdAt?: string;
}

export interface SavedSearch {
  id: string;
  query: string;
  scope?: string;
  createdAt?: string;
}

export interface Reminder {
  id: string;
  title: string;
  eventId?: string;
  dueAt?: string;
  createdAt?: string;
}

export interface Membership {
  id: string;
  communitySlug: string;
  name: string;
  createdAt?: string;
}

function isoOf(value: unknown): string | undefined {
  return (value as { toDate?: () => Date } | undefined)?.toDate?.().toISOString();
}

async function readCollection<T>(
  uid: string,
  sub: string,
  map: (id: string, data: Record<string, unknown>) => T,
): Promise<T[]> {
  if (!db) return [];
  const q = query(collection(db, "users", uid, sub), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => map(d.id, d.data()));
}

/* --- Favorites --- */

export function fetchFavorites(uid: string): Promise<Favorite[]> {
  return readCollection(uid, "favorites", (id, d) => ({
    id,
    type: d.type as ContentType,
    refId: (d.refId as string) ?? "",
    title: (d.title as string) ?? "",
    href: (d.href as string) ?? "",
    createdAt: isoOf(d.createdAt),
  }));
}

/** Idempotent: keyed by `${type}_${refId}` so toggling on twice is a no-op. */
export async function addFavorite(
  uid: string,
  fav: Omit<Favorite, "id" | "createdAt">,
): Promise<string> {
  if (!db) throw new Error("Firebase non configuré.");
  const id = `${fav.type}_${fav.refId}`;
  await setDoc(doc(db, "users", uid, "favorites", id), {
    ...fav,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function removeFavorite(uid: string, favId: string): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await deleteDoc(doc(db, "users", uid, "favorites", favId));
}

/* --- Saved searches --- */

export function fetchSavedSearches(uid: string): Promise<SavedSearch[]> {
  return readCollection(uid, "savedSearches", (id, d) => ({
    id,
    query: (d.query as string) ?? "",
    scope: d.scope as string | undefined,
    createdAt: isoOf(d.createdAt),
  }));
}

export async function saveSearch(
  uid: string,
  input: { query: string; scope?: string },
): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  const id = encodeURIComponent(`${input.query}__${input.scope ?? "all"}`).slice(0, 200);
  await setDoc(doc(db, "users", uid, "savedSearches", id), {
    query: input.query,
    scope: input.scope ?? "all",
    createdAt: serverTimestamp(),
  });
}

export async function removeSavedSearch(uid: string, id: string): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await deleteDoc(doc(db, "users", uid, "savedSearches", id));
}

/* --- Reminders --- */

export function fetchReminders(uid: string): Promise<Reminder[]> {
  return readCollection(uid, "reminders", (id, d) => ({
    id,
    title: (d.title as string) ?? "",
    eventId: d.eventId as string | undefined,
    dueAt: d.dueAt as string | undefined,
    createdAt: isoOf(d.createdAt),
  }));
}

/* --- Community memberships --- */

export function fetchMemberships(uid: string): Promise<Membership[]> {
  return readCollection(uid, "memberships", (id, d) => ({
    id,
    communitySlug: (d.communitySlug as string) ?? id,
    name: (d.name as string) ?? "",
    createdAt: isoOf(d.createdAt),
  }));
}

/** Join is idempotent (doc id = community slug). */
export async function joinCommunity(
  uid: string,
  community: { slug: string; name: string },
): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await setDoc(doc(db, "users", uid, "memberships", community.slug), {
    communitySlug: community.slug,
    name: community.name,
    createdAt: serverTimestamp(),
  });
}

export async function leaveCommunity(uid: string, slug: string): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await deleteDoc(doc(db, "users", uid, "memberships", slug));
}

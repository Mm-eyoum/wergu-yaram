/**
 * Admin moderation over user-generated content: forum threads and community
 * posts. Listing is read-only and cross-cutting (community posts are gathered
 * from every community via a collection-group query); removal is audit-logged.
 */
import {
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
} from "@/services/db";
import { db } from "@/services/firebase";
import { logAudit } from "@/services/audit";
import { timeAgoLabel } from "@/services/communityPosts";

export interface ModeratablePost {
  id: string;
  path: string; // full Firestore path, used for deletion
  communitySlug: string;
  author: string;
  content: string;
  timeAgo: string;
}

/** All community posts across every community, newest first. */
export async function fetchAllCommunityPosts(max = 100): Promise<ModeratablePost[]> {
  if (!db) return [];
  const snap = await getDocs(
    query(collectionGroup(db, "posts"), orderBy("createdAt", "desc"), limit(max)),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    const created = (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
    return {
      id: d.id,
      path: d.ref.path,
      communitySlug: d.ref.parent.parent?.id ?? "",
      author: (data.author as { name?: string } | undefined)?.name ?? "Membre",
      content: (data.content as string) ?? "",
      timeAgo: created ? timeAgoLabel(created) : "à l'instant",
    };
  });
}

/** Remove a community post by full path (audit-logged). */
export async function deleteCommunityPost(post: ModeratablePost): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await deleteDoc(doc(db, post.path));
  void logAudit({
    action: "delete",
    resourceType: "communityPost",
    resourceId: post.id,
    resourceTitle: post.content.slice(0, 80),
  });
}

/** Remove a forum thread by id (audit-logged). */
export async function deleteForumThread(thread: { id: string; title: string }): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await deleteDoc(doc(db, "forumThreads", thread.id));
  void logAudit({
    action: "delete",
    resourceType: "forumThread",
    resourceId: thread.id,
    resourceTitle: thread.title,
  });
}

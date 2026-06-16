/**
 * Generic admin CRUD over a public-content collection. One factory backs all
 * eight editorial types (medications, articles, …) with consistent audit
 * logging and publish/draft handling. Reads here are admin-scoped: unlike the
 * public `catalog.ts`, they return ALL documents including drafts.
 *
 * Document id === the entity's slug/id (same convention as scripts/seed.ts),
 * so single-item reads and writes address the document directly.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { logAudit } from "@/services/audit";

export interface ContentResource<T> {
  /** Firestore collection name (e.g. "articles"). */
  collection: string;
  /** Field used as the document id ("slug" for most, "id" for events/needs). */
  idField: keyof T & string;
  /** Field shown as the human title in tables / audit entries. */
  titleField: keyof T & string;
  /** Singular label for audit `resourceType`. */
  resourceType: string;
}

function idOf<T>(res: ContentResource<T>, item: T): string {
  return String(item[res.idField]);
}
function titleOf<T>(res: ContentResource<T>, item: T): string {
  return String(item[res.titleField] ?? idOf(res, item));
}

export interface ContentAdmin<T> {
  resource: ContentResource<T>;
  listAll: () => Promise<T[]>;
  getOne: (id: string) => Promise<T | null>;
  save: (item: T, opts?: { isNew?: boolean }) => Promise<void>;
  remove: (item: T) => Promise<void>;
  setPublished: (item: T, published: boolean) => Promise<void>;
}

export function makeContentAdmin<T extends object>(
  resource: ContentResource<T>,
): ContentAdmin<T> {
  return {
    resource,

    async listAll() {
      if (!db) return [];
      const snap = await getDocs(query(collection(db, resource.collection)));
      return snap.docs.map((d) => d.data() as T);
    },

    async getOne(id: string) {
      if (!db) return null;
      const snap = await getDoc(doc(db, resource.collection, id));
      return snap.exists() ? (snap.data() as T) : null;
    },

    async save(item: T, opts) {
      if (!db) throw new Error("Firebase non configuré.");
      const id = idOf(resource, item);
      if (!id) throw new Error("Identifiant (slug) requis.");
      await setDoc(doc(db, resource.collection, id), {
        ...item,
        updatedAt: serverTimestamp(),
      });
      void logAudit({
        action: opts?.isNew ? "create" : "update",
        resourceType: resource.resourceType,
        resourceId: id,
        resourceTitle: titleOf(resource, item),
      });
    },

    async remove(item: T) {
      if (!db) throw new Error("Firebase non configuré.");
      const id = idOf(resource, item);
      await deleteDoc(doc(db, resource.collection, id));
      void logAudit({
        action: "delete",
        resourceType: resource.resourceType,
        resourceId: id,
        resourceTitle: titleOf(resource, item),
      });
    },

    async setPublished(item: T, published: boolean) {
      if (!db) throw new Error("Firebase non configuré.");
      const id = idOf(resource, item);
      await updateDoc(doc(db, resource.collection, id), {
        published,
        updatedAt: serverTimestamp(),
      });
      void logAudit({
        action: published ? "publish" : "unpublish",
        resourceType: resource.resourceType,
        resourceId: id,
        resourceTitle: titleOf(resource, item),
        changes: { published: { old: !published, new: published } },
      });
    },
  };
}

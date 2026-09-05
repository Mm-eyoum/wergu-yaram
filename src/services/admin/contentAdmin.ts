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
  where,
} from "@/services/db";
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
  /**
   * Relit le document juste après écriture pour confirmer qu'il a bien été
   * persisté côté serveur. Détecte les écritures acceptées en local mais
   * rejetées serveur (App Check / règles), qui afficheraient un faux succès.
   * Réservé aux types critiques (ex. tenants = sous-domaine public).
   */
  verifyWrite?: boolean;
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

/**
 * Optional tenant scope: restricts the admin to ONE partner space. `listAll`
 * only returns docs where `field == value`, and `save` stamps `field` + the
 * owner uid on every write so partner-created content is always correctly
 * tagged (the Firestore rules enforce the same on the server).
 */
export interface ContentScope {
  field: "tenantSlug";
  value: string;
  ownerUid?: string;
}

export function makeContentAdmin<T extends object>(
  resource: ContentResource<T>,
  scope?: ContentScope,
): ContentAdmin<T> {
  return {
    resource,

    async listAll() {
      if (!db) return [];
      const base = collection(db, resource.collection);
      const q = scope ? query(base, where(scope.field, "==", scope.value)) : query(base);
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as T);
    },

    async getOne(id: string) {
      if (!db) return null;
      const snap = await getDoc(doc(db, resource.collection, id));
      if (!snap.exists()) return null;
      const data = snap.data() as T & Record<string, unknown>;
      // Scoped admins can only open their own tenant's docs.
      if (scope && data[scope.field] !== scope.value) return null;
      return data as T;
    },

    async save(item: T, opts) {
      if (!db) throw new Error("Firebase non configuré.");
      const id = idOf(resource, item);
      if (!id) throw new Error("Identifiant (slug) requis.");
      const scoped = scope
        ? { ...item, [scope.field]: scope.value, ...(scope.ownerUid ? { ownerUid: scope.ownerUid } : {}) }
        : item;
      await setDoc(doc(db, resource.collection, id), {
        ...scoped,
        updatedAt: serverTimestamp(),
      });
      // Lecture de contrôle : un setDoc résolu localement mais rejeté serveur
      // (App Check / règles) laisserait le doc absent — on lève alors une erreur
      // explicite plutôt que de laisser l'UI annoncer un faux succès.
      if (resource.verifyWrite) {
        const check = await getDoc(doc(db, resource.collection, id));
        if (!check.exists()) {
          throw new Error(
            "L'enregistrement n'a pas été confirmé côté serveur (droits insuffisants ou App Check). Vérifiez votre rôle éditeur.",
          );
        }
      }
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

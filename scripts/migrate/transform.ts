/**
 * Transformation NDJSON (Firestore) → lignes SQL (D1). Étape 2 de la migration.
 *
 * Fonctions PURES : aucune I/O, aucun accès réseau. C'est ce qui rend la
 * transformation testable et rejouable à l'identique.
 *
 * Trois conversions structurantes :
 *  1. {__ts: millis} → entier epoch ms sur created_at/updated_at ; les autres
 *     horodatages restent tels quels dans la charge utile JSON, où le shim
 *     client les réhydrate.
 *  2. Les URLs Firebase Storage persistées sont réécrites vers R2 via une carte
 *     fournie. Toute URL non reconnue fait ÉCHOUER la transformation : une image
 *     silencieusement cassée est pire qu'un script qui s'arrête.
 *  3. `published` absent signifie publié (cf. isPublic() dans catalog.ts) — on
 *     ne l'invente pas ici, la colonne générée de D1 s'en charge.
 */

export interface RawDoc {
  __id: string;
  __parent?: string;
  __uid?: string;
  __parentId?: string | null;
  [k: string]: unknown;
}

export type UrlMap = ReadonlyMap<string, string>;

const FIREBASE_STORAGE_RE = /https:\/\/firebasestorage\.googleapis\.com\/[^\s"']+/g;

/** Horodatage Firestore encodé → epoch ms. */
export function tsToMillis(value: unknown, fallback: number): number {
  if (value && typeof value === "object" && "__ts" in (value as object)) {
    const ms = (value as { __ts: unknown }).__ts;
    if (typeof ms === "number" && Number.isFinite(ms)) return ms;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

/**
 * Réécrit récursivement toute URL Firebase Storage rencontrée, à quelque
 * profondeur que ce soit. On ne liste PAS les champs concernés : ils sont
 * dispersés (media.url, facilities.cover, tenants.theme.banner,
 * equipmentNeeds.gallery[]…) et une énumération manuelle finirait par en oublier.
 */
export function rewriteStorageUrls(
  value: unknown,
  map: UrlMap,
  unresolved: string[],
): unknown {
  if (typeof value === "string") {
    if (!value.includes("firebasestorage.googleapis.com")) return value;
    return value.replace(FIREBASE_STORAGE_RE, (url) => {
      const mapped = map.get(url);
      if (!mapped) {
        unresolved.push(url);
        return url;
      }
      return mapped;
    });
  }
  if (Array.isArray(value)) return value.map((v) => rewriteStorageUrls(v, map, unresolved));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = rewriteStorageUrls(v, map, unresolved);
    }
    return out;
  }
  return value;
}

/** Retire les métadonnées d'export avant écriture. */
export function stripMeta(doc: RawDoc): Record<string, unknown> {
  const { __id, __parent, __uid, __parentId, ...rest } = doc;
  void __id;
  void __parent;
  void __uid;
  void __parentId;
  return rest;
}

export interface DocumentRow {
  collection: string;
  id: string;
  data: string;
  created_at: number;
  updated_at: number;
}

/**
 * Ligne de la table générique `documents`.
 *
 * ⚠️ L'id du document est réinjecté dans la charge utile sous la clé attendue
 * (`slug` ou `id`) : catalog.ts renvoie `snap.data()` et JETTE l'id Firestore,
 * donc tout document doit porter le sien pour que le client fonctionne à
 * l'identique.
 */
export function toDocumentRow(
  collection: string,
  doc: RawDoc,
  map: UrlMap,
  unresolved: string[],
  idField: "slug" | "id",
  now: number,
): DocumentRow {
  const body = rewriteStorageUrls(stripMeta(doc), map, unresolved) as Record<string, unknown>;
  if (body[idField] === undefined) body[idField] = doc.__id;
  const created = tsToMillis(body.createdAt, now);
  const updated = tsToMillis(body.updatedAt, created);
  return {
    collection,
    id: doc.__id,
    data: JSON.stringify(body),
    created_at: created,
    updated_at: updated,
  };
}

/** Collections dont l'id de document EST le slug métier. */
export const SLUG_KEYED = new Set([
  "medications",
  "pathologies",
  "articles",
  "facilities",
  "communities",
  "formations",
  "partners",
  "partnerOffers",
  "testimonials",
  "tenants",
]);

export function idFieldFor(collection: string): "slug" | "id" {
  return SLUG_KEYED.has(collection) ? "slug" : "id";
}

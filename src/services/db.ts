/**
 * Shim à la forme de l'API Firestore, au-dessus de l'API Workers/D1.
 *
 * POURQUOI CE FICHIER EXISTE
 * Le code compte 105 points d'appel Firestore répartis sur 29 fichiers. Les
 * réécrire tous d'un coup serait un changement massif, non relisible et
 * impossible à annuler collection par collection. Ce shim réexporte EXACTEMENT
 * les symboles que ce code importe de `firebase/firestore`, si bien que la
 * migration d'un service se réduit à :
 *
 *   -import { collection, getDocs, query, where } from "firebase/firestore";
 *   +import { collection, getDocs, query, where } from "@/services/db";
 *
 * Le vocabulaire réellement utilisé est petit et borné (37 égalités, un seul
 * `array-contains`, un seul curseur, aucun opérateur de plage), ce qui rend
 * l'exercice tenable.
 *
 * C'EST UN VÉHICULE, PAS UNE DESTINATION
 * Une fois une collection basculée et stabilisée, le service correspondant est
 * réécrit en `fetch()` direct — en commençant par ceux qui y gagnent le plus
 * (tenantAnalytics : 10 requêtes → 1 ; siteConfig : 6 → 1).
 *
 * PÉRIMÈTRE ACTUEL (Lot 2) : seules les LECTURES sont routées vers D1. Toute
 * écriture est déléguée à Firestore, qui reste maître, jusqu'au Lot 4.
 */
import * as fs from "firebase/firestore";
import { db as firestore } from "./firebase";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./apiClient";
import { readsFromD1 as readRoute, writesToD1 } from "./dbRouting";

// --- Horodatages -------------------------------------------------------------

/**
 * Équivalent minimal de `firebase.firestore.Timestamp`.
 *
 * L'API transporte les horodatages en `{"__ts": epochMillis}`. Les réhydrater
 * ici évite de toucher aux ~12 helpers `isoOf(v)` dupliqués dans les services
 * et aux mappeurs (`toOrganization`, `toClaim`, `toThread`…), qui appellent tous
 * `.toDate()` ou `.toMillis()`.
 */
export class Timestamp {
  constructor(readonly seconds: number, readonly nanoseconds: number) {}
  static fromMillis(ms: number): Timestamp {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
  static fromDate(d: Date): Timestamp {
    return Timestamp.fromMillis(d.getTime());
  }
  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }
  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }
  toDate(): Date {
    return new Date(this.toMillis());
  }
}

function isTsEnvelope(v: unknown): v is { __ts: number } {
  return (
    typeof v === "object" &&
    v !== null &&
    "__ts" in v &&
    typeof (v as { __ts: unknown }).__ts === "number"
  );
}

/** Convertit récursivement les enveloppes `{__ts}` en Timestamp. */
function reviveTimestamps(value: unknown): unknown {
  if (isTsEnvelope(value)) return Timestamp.fromMillis(value.__ts);
  if (Array.isArray(value)) return value.map(reviveTimestamps);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = reviveTimestamps(v);
    }
    return out;
  }
  return value;
}

/**
 * Forme d'un document, identique au `DocumentData` de Firestore.
 *
 * Le `any` est DÉLIBÉRÉ et nécessaire : c'est exactement ce que déclare le SDK
 * Firestore, et c'est ce qui permet aux ~90 sites d'appel existants de faire
 * `snap.data() as Facility` ou `data.displayName` sans transtypage
 * intermédiaire. Un `Record<string, unknown>` plus strict imposerait de
 * réécrire chacun de ces sites — l'inverse du but du shim.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DocumentData = { [field: string]: any };

// --- Descripteurs ------------------------------------------------------------

interface CollRef {
  __t: "coll";
  segments: string[];
}
interface DocRefLike {
  __t: "doc";
  segments: string[];
  id: string;
  path: string;
  parent: { id: string; path: string; parent: { id: string } | null };
}
type Constraint =
  | { k: "where"; field: string; op: fs.WhereFilterOp; value: unknown }
  | { k: "orderBy"; field: string; dir: "asc" | "desc" }
  | { k: "limit"; n: number }
  | { k: "startAfter"; value: unknown };

interface QueryLike {
  __t: "query";
  ref: CollRef;
  constraints: Constraint[];
}

/** Nom de collection de premier niveau ; `null` pour une sous-collection. */
function topLevelName(ref: CollRef): string | null {
  return ref.segments.length === 1 ? ref.segments[0] : null;
}

/** Une lecture ne part vers D1 que si la collection est basculée ET de 1er niveau. */
function readsFromD1(ref: CollRef): boolean {
  const name = topLevelName(ref);
  return name !== null && readRoute(name);
}

// --- Constructeurs (mêmes signatures que firebase/firestore) -----------------

export function collection(_db: unknown, ...segments: string[]): CollRef {
  return { __t: "coll", segments };
}

export function collectionGroup(_db: unknown, id: string): CollRef {
  // Marqué pour que `getDocs` sache déléguer : une requête de groupe n'a pas
  // d'équivalent générique côté API (elle a sa propre route de modération).
  return { __t: "coll", segments: ["__group__", id] };
}

export function doc(_db: unknown, ...segments: string[]): DocRefLike {
  // `doc(db, "a/b/c")` (chemin complet) autant que `doc(db, "a", "b")`.
  const parts = segments.length === 1 ? segments[0].split("/") : segments;
  const id = parts[parts.length - 1];
  const parentSegments = parts.slice(0, -1);
  const grandParentId = parentSegments.length >= 2 ? parentSegments[parentSegments.length - 2] : null;
  return {
    __t: "doc",
    segments: parts,
    id,
    path: parts.join("/"),
    parent: {
      id: parentSegments[parentSegments.length - 1] ?? "",
      path: parentSegments.join("/"),
      parent: grandParentId ? { id: grandParentId } : null,
    },
  };
}

export function query(ref: CollRef, ...constraints: Constraint[]): QueryLike {
  return { __t: "query", ref, constraints };
}
export const where = (field: string, op: fs.WhereFilterOp, value: unknown): Constraint => ({
  k: "where",
  field,
  op,
  value,
});
export const orderBy = (field: string, dir: "asc" | "desc" = "asc"): Constraint => ({
  k: "orderBy",
  field,
  dir,
});
export const limit = (n: number): Constraint => ({ k: "limit", n });
export const startAfter = (value: unknown): Constraint => ({ k: "startAfter", value });

// --- Instantanés -------------------------------------------------------------

/**
 * Résultat d'un `getDoc` : le document peut ne pas exister, donc `data()` est
 * optionnel — exactement comme `DocumentSnapshot` de Firestore.
 */
class DocSnap {
  constructor(
    readonly id: string,
    protected readonly _data: DocumentData | null,
    readonly ref: DocRefLike,
  ) {}
  /**
   * Prédicat de TYPE, pas un simple booléen.
   *
   * Firestore déclare `exists(): this is QueryDocumentSnapshot<T>` : c'est ce qui
   * permet à `if (!snap.exists()) return;` d'affiner `data()` en non-optionnel
   * pour la suite de la fonction. Sans cette signature, tout appelant existant
   * devrait ajouter un `!` ou un `?.`.
   */
  exists(): this is QueryDocSnap {
    return this._data !== null;
  }
  data(): DocumentData | undefined {
    return this._data ?? undefined;
  }
}

/**
 * Élément d'un `getDocs` : il provient d'un résultat de requête, donc il EXISTE
 * forcément et `data()` n'est jamais `undefined` — la distinction que fait
 * Firestore entre `DocumentSnapshot` et `QueryDocumentSnapshot`.
 *
 * Ne pas la reproduire imposait un `?.` ou un `!` sur chacun des ~90 sites
 * d'appel qui font `d.data()` après un `getDocs`.
 */
class QueryDocSnap extends DocSnap {
  constructor(id: string, data: DocumentData, ref: DocRefLike) {
    super(id, data, ref);
  }
  override exists(): this is QueryDocSnap {
    return true;
  }
  override data(): DocumentData {
    return this._data as DocumentData;
  }
}

class QuerySnap {
  constructor(readonly docs: QueryDocSnap[]) {}
  get empty(): boolean {
    return this.docs.length === 0;
  }
  get size(): number {
    return this.docs.length;
  }
  forEach(fn: (d: QueryDocSnap) => void): void {
    this.docs.forEach(fn);
  }
}

// --- Traduction requête → API ------------------------------------------------

function buildSearchParams(constraints: Constraint[]): URLSearchParams {
  const params = new URLSearchParams();
  for (const c of constraints) {
    if (c.k === "where") {
      if (c.op !== "==") {
        // Aucun autre opérateur n'est utilisé dans le code (vérifié à l'audit) ;
        // en rencontrer un est un bug, pas un cas à traiter silencieusement.
        throw new Error(`Opérateur « ${c.op} » non supporté par l'API générique.`);
      }
      params.append("where", `${c.field}:eq:${String(c.value)}`);
    } else if (c.k === "orderBy") {
      params.set("orderBy", c.field);
      params.set("dir", c.dir);
    } else if (c.k === "limit") {
      params.set("limit", String(c.n));
    }
  }
  return params;
}

// --- Lectures ----------------------------------------------------------------

export async function getDocs(source: CollRef | QueryLike): Promise<QuerySnap> {
  const ref = source.__t === "query" ? source.ref : source;
  const constraints = source.__t === "query" ? source.constraints : [];

  if (!readsFromD1(ref)) {
    if (!firestore) return new QuerySnap([]);
    const fsRef =
      ref.segments[0] === "__group__"
        ? fs.collectionGroup(firestore, ref.segments[1])
        : fs.collection(firestore, ref.segments[0], ...ref.segments.slice(1));
    const fsQuery = fs.query(fsRef, ...toFirestoreConstraints(constraints));
    const snap = await fs.getDocs(fsQuery);
    return new QuerySnap(
      snap.docs.map(
        (d) => new QueryDocSnap(d.id, d.data() as DocumentData, doc(null, d.ref.path)),
      ),
    );
  }

  const name = topLevelName(ref) as string;
  const params = buildSearchParams(constraints);
  const qs = params.toString();
  const body = await apiGet<{ items: DocumentData[] }>(
    `/api/v1/collections/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`,
  );
  return new QuerySnap(
    body.items.map((item) => {
      const data = reviveTimestamps(item) as DocumentData;
      const id = String(data.slug ?? data.id ?? "");
      return new QueryDocSnap(id, data, doc(null, name, id));
    }),
  );
}

export async function getDoc(ref: DocRefLike): Promise<DocSnap> {
  const isTopLevel = ref.segments.length === 2;
  const name = isTopLevel ? ref.segments[0] : null;

  if (!name || !readRoute(name)) {
    if (!firestore) return new DocSnap(ref.id, null, ref);
    const snap = await fs.getDoc(fs.doc(firestore, ref.segments[0], ...ref.segments.slice(1)));
    return new DocSnap(
      snap.id,
      snap.exists() ? (snap.data() as DocumentData) : null,
      ref,
    );
  }

  try {
    const item = await apiGet<DocumentData>(
      `/api/v1/collections/${encodeURIComponent(name)}/${encodeURIComponent(ref.id)}`,
    );
    return new DocSnap(ref.id, reviveTimestamps(item) as DocumentData, ref);
  } catch (err) {
    // 404 ⇒ document absent, exactement comme `snap.exists() === false`.
    if ((err as { status?: number }).status === 404) return new DocSnap(ref.id, null, ref);
    throw err;
  }
}

function toFirestoreConstraints(constraints: Constraint[]): fs.QueryConstraint[] {
  return constraints.map((c) => {
    if (c.k === "where") return fs.where(c.field, c.op, c.value);
    if (c.k === "orderBy") return fs.orderBy(c.field, c.dir);
    if (c.k === "limit") return fs.limit(c.n);
    return fs.startAfter(c.value);
  });
}

// --- Écritures ---------------------------------------------------------------
//
// Routées vers l'API quand la collection est basculée, déléguées à Firestore
// sinon. Le drapeau vit dans dbRouting.ts : rebasculer une collection après un
// incident est un changement de configuration, pas un correctif de code.

function requireFirestore(): fs.Firestore {
  if (!firestore) throw new Error("Firebase non configuré.");
  return firestore;
}

/**
 * Sentinelle remplacée par l'horloge du serveur.
 *
 * Le client conserve ses 45 appels à `serverTimestamp()` ; c'est le Worker qui
 * décide de l'heure. Deux horloges produiraient des ordres de tri divergents
 * entre Firestore et D1 pendant la fenêtre de double écriture.
 */
const SERVER_TS_SENTINEL = "__server_timestamp__";

/**
 * Convertit sentinelles et Timestamps en JSON transportable.
 *
 * Les `FieldValue` de Firestore (`serverTimestamp()`, `increment()`…) n'ont pas
 * de représentation JSON. On les repère par `_methodName`, que le SDK pose sur
 * chaque sentinelle — plus fiable qu'un `instanceof` après minification.
 */
function serializeForApi(value: unknown): unknown {
  if (value instanceof Timestamp) return { __ts: value.toMillis() };
  if (Array.isArray(value)) return value.map(serializeForApi);
  if (value && typeof value === "object") {
    const method = (value as { _methodName?: string })._methodName;
    if (method) {
      if (method === "serverTimestamp") return SERVER_TS_SENTINEL;
      // increment / arrayUnion / arrayRemove ne sont utilisés NULLE PART côté
      // client (vérifié à l'audit) ; en rencontrer un est un bug, pas un cas à
      // convertir au hasard.
      throw new Error(`Sentinelle « ${method} » non supportée par l'API.`);
    }
    if (typeof (value as { toMillis?: unknown }).toMillis === "function") {
      return { __ts: (value as { toMillis: () => number }).toMillis() };
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeForApi(v);
    }
    return out;
  }
  return value;
}

/** `serverTimestamp()` — sentinelle Firestore, traduite à la sérialisation. */
export const serverTimestamp = fs.serverTimestamp;

export async function addDoc(ref: CollRef, data: DocumentData) {
  const name = topLevelName(ref);
  if (name && writesToD1(name)) {
    const created = await apiPost<DocumentData>(
      `/api/v1/collections/${encodeURIComponent(name)}`,
      serializeForApi(data),
    );
    return doc(null, name, String(created.id ?? created.slug ?? ""));
  }
  const f = requireFirestore();
  return fs.addDoc(fs.collection(f, ref.segments[0], ...ref.segments.slice(1)), data);
}

export async function setDoc(ref: DocRefLike, data: DocumentData, options?: fs.SetOptions) {
  const name = ref.segments.length === 2 ? ref.segments[0] : null;
  if (name && writesToD1(name)) {
    // `{merge:true}` ≡ PATCH ; sinon remplacement complet ≡ PUT.
    const merge = Boolean((options as { merge?: boolean } | undefined)?.merge);
    const path = `/api/v1/collections/${encodeURIComponent(name)}/${encodeURIComponent(ref.id)}`;
    await (merge ? apiPatch(path, serializeForApi(data)) : apiPut(path, serializeForApi(data)));
    return;
  }
  const f = requireFirestore();
  const d = fs.doc(f, ref.segments[0], ...ref.segments.slice(1));
  return options ? fs.setDoc(d, data, options) : fs.setDoc(d, data);
}

export async function updateDoc(ref: DocRefLike, data: DocumentData) {
  const name = ref.segments.length === 2 ? ref.segments[0] : null;
  if (name && writesToD1(name)) {
    await apiPatch(
      `/api/v1/collections/${encodeURIComponent(name)}/${encodeURIComponent(ref.id)}`,
      serializeForApi(data),
    );
    return;
  }
  const f = requireFirestore();
  return fs.updateDoc(fs.doc(f, ref.segments[0], ...ref.segments.slice(1)), data);
}

export async function deleteDoc(ref: DocRefLike) {
  const name = ref.segments.length === 2 ? ref.segments[0] : null;
  if (name && writesToD1(name)) {
    await apiDelete(`/api/v1/collections/${encodeURIComponent(name)}/${encodeURIComponent(ref.id)}`);
    return;
  }
  const f = requireFirestore();
  return fs.deleteDoc(fs.doc(f, ref.segments[0], ...ref.segments.slice(1)));
}

export async function getCountFromServer(source: CollRef | QueryLike) {
  const f = requireFirestore();
  const ref = source.__t === "query" ? source.ref : source;
  const constraints = source.__t === "query" ? source.constraints : [];
  const fsRef = fs.collection(f, ref.segments[0], ...ref.segments.slice(1));
  return fs.getCountFromServer(fs.query(fsRef, ...toFirestoreConstraints(constraints)));
}

/**
 * Temps réel — délégué intégralement à Firestore (le Lot 5 le remplacera par un
 * Durable Object en WebSocket).
 *
 * Les surcharges reproduisent celles du SDK : un `DocumentReference` donne un
 * instantané de document, une requête un instantané de requête. L'instantané
 * Firestore est ENVELOPPÉ dans les classes du shim, pour que le type annoncé et
 * l'objet réellement reçu coïncident.
 */
export function onSnapshot(
  ref: DocRefLike,
  onNext: (snapshot: DocSnap) => void,
  onError?: (error: Error) => void,
): () => void;
export function onSnapshot(
  source: CollRef | QueryLike,
  onNext: (snapshot: QuerySnap) => void,
  onError?: (error: Error) => void,
): () => void;
export function onSnapshot(
  source: CollRef | QueryLike | DocRefLike,
  onNext: (snapshot: never) => void,
  onError?: (error: Error) => void,
): () => void {
  const f = requireFirestore();
  const emit = onNext as (s: DocSnap | QuerySnap) => void;

  if ((source as DocRefLike).__t === "doc") {
    const r = source as DocRefLike;
    return fs.onSnapshot(
      fs.doc(f, r.segments[0], ...r.segments.slice(1)),
      (snap) => emit(new DocSnap(snap.id, snap.exists() ? (snap.data() as DocumentData) : null, r)),
      onError,
    );
  }

  const ref = (source as QueryLike).__t === "query" ? (source as QueryLike).ref : (source as CollRef);
  const constraints =
    (source as QueryLike).__t === "query" ? (source as QueryLike).constraints : [];
  const fsRef = fs.collection(f, ref.segments[0], ...ref.segments.slice(1));
  return fs.onSnapshot(
    fs.query(fsRef, ...toFirestoreConstraints(constraints)),
    (snap) =>
      emit(
        new QuerySnap(
          snap.docs.map(
            (d) => new QueryDocSnap(d.id, d.data() as DocumentData, doc(null, d.ref.path)),
          ),
        ),
      ),
    onError,
  );
}

export const writeBatch = fs.writeBatch;
export const increment = fs.increment;
export const arrayUnion = fs.arrayUnion;
export const arrayRemove = fs.arrayRemove;
export const deleteField = fs.deleteField;

/** Alias attendu par stats.ts et tenantAnalytics.ts (`type Query`). */
export type Query = CollRef | QueryLike;

export type { CollRef, DocRefLike, QueryLike };
export { DocSnap, QueryDocSnap, QuerySnap };

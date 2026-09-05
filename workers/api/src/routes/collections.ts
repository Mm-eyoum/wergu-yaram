/**
 * Endpoint générique de lecture — remplace les appels Firestore directs de
 * catalog.ts sans que celui-ci ait à connaître le nom des tables.
 *
 *   GET /api/v1/collections/:name?where=champ:eq:valeur&orderBy=…&dir=desc&limit=…
 *   GET /api/v1/collections/:name/:id
 */
import type { Env } from "../auth/context";
import { ApiError, json } from "../lib/http";
import { lookup } from "../db/registry";
import type { Ctx, Doc, ListScope } from "../policy/types";

const MAX_LIMIT = 500; // aligné sur CATALOG_PAGE_SIZE dans src/services/catalog.ts

/** Traduit le cadrage de la politique en fragment SQL. `deny` coupe court. */
function scopeToSql(scope: ListScope): { where: string; params: unknown[] } | null {
  if (scope.kind === "deny") return null;
  if (scope.kind === "all") return { where: "1=1", params: [] };
  return { where: scope.where, params: scope.params };
}

export async function listCollection(
  env: Env,
  ctx: Ctx,
  name: string,
  url: URL,
): Promise<Response> {
  const reg = lookup(name);
  if (!reg) throw new ApiError("not-found", `Collection « ${name} » inconnue.`);

  const scope = scopeToSql(reg.policy("").list(ctx));
  if (!scope) throw new ApiError("permission-denied", "Lecture non autorisée.");

  const clauses = ["collection = ?", "deleted_at IS NULL"];
  const params: unknown[] = [name];

  // Cadrage public : seuls les documents publiés, sauf demande admin explicite.
  const wantsDrafts = url.searchParams.get("scope") === "admin";
  if (wantsDrafts) {
    const role = ctx.actor?.role;
    if (role !== "editor" && role !== "admin" && role !== "super_admin") {
      throw new ApiError("permission-denied", "Brouillons réservés au staff éditorial.");
    }
  } else {
    clauses.push("published = 1");
  }

  for (const raw of url.searchParams.getAll("where")) {
    const [field, op, ...rest] = raw.split(":");
    const value = rest.join(":");
    const column = reg.filterable[field];
    if (!column) throw new ApiError("invalid-argument", `Filtre « ${field} » non autorisé.`);
    if (op !== "eq") throw new ApiError("invalid-argument", `Opérateur « ${op} » non supporté.`);
    clauses.push(`${column} = ?`);
    params.push(value);
  }

  const orderKey = url.searchParams.get("orderBy") ?? "updatedAt";
  const orderColumn = reg.sortable[orderKey];
  if (!orderColumn) throw new ApiError("invalid-argument", `Tri « ${orderKey} » non autorisé.`);
  const dir = url.searchParams.get("dir") === "asc" ? "ASC" : "DESC";

  const limit = Math.min(Number(url.searchParams.get("limit") ?? MAX_LIMIT) || MAX_LIMIT, MAX_LIMIT);

  const sql =
    `SELECT id, data, created_at, updated_at FROM documents ` +
    `WHERE ${clauses.join(" AND ")} AND (${scope.where}) ` +
    `ORDER BY ${orderColumn} ${dir} LIMIT ?`;

  const { results } = await env.DB.prepare(sql)
    .bind(...params, ...scope.params, limit)
    .all<{ id: string; data: string; created_at: number; updated_at: number }>();

  return json({
    items: (results ?? []).map((r) => ({
      ...JSON.parse(r.data),
      createdAt: { __ts: r.created_at },
      updatedAt: { __ts: r.updated_at },
    })),
  });
}

export async function getDocument(
  env: Env,
  ctx: Ctx,
  name: string,
  id: string,
): Promise<Response> {
  const reg = lookup(name);
  if (!reg) throw new ApiError("not-found", `Collection « ${name} » inconnue.`);

  const row = await env.DB.prepare(
    "SELECT id, data, created_at, updated_at, published FROM documents WHERE collection = ? AND id = ? AND deleted_at IS NULL",
  )
    .bind(name, id)
    .first<{ id: string; data: string; created_at: number; updated_at: number; published: number }>();

  if (!row) throw new ApiError("not-found", "Document introuvable.");

  const body = JSON.parse(row.data) as Record<string, unknown>;
  const policy = reg.policy(id);
  if (!policy.read || !policy.read(ctx, body, null).allow) {
    throw new ApiError("permission-denied", "Lecture non autorisée.");
  }
  // Un brouillon n'est visible que du staff éditorial.
  if (row.published === 0) {
    const role = ctx.actor?.role;
    if (role !== "editor" && role !== "admin" && role !== "super_admin") {
      throw new ApiError("not-found", "Document introuvable.");
    }
  }

  return json({
    ...body,
    createdAt: { __ts: row.created_at },
    updatedAt: { __ts: row.updated_at },
  });
}


// =============================================================
// Écritures — Lot 4
// =============================================================

/** Champs que le serveur pose lui-même : jamais acceptés du client. */
const SERVER_FIELDS = new Set(["createdAt", "updatedAt", "__ts"]);

/**
 * Sentinelle `serverTimestamp()` du shim client.
 * Le client continue d'appeler `serverTimestamp()` sur ses 45 sites d'écriture ;
 * la valeur est remplacée ici par l'horloge du serveur, seule source de vérité.
 */
const SERVER_TS = "__server_timestamp__";

function stripServerFields(body: Doc): Doc {
  const out: Doc = {};
  for (const [k, v] of Object.entries(body)) {
    if (SERVER_FIELDS.has(k)) continue;
    if (v === SERVER_TS) continue;
    out[k] = v;
  }
  return out;
}

async function loadDocument(env: Env, collection: string, id: string): Promise<Doc | null> {
  const row = await env.DB.prepare(
    "SELECT data FROM documents WHERE collection = ? AND id = ? AND deleted_at IS NULL",
  )
    .bind(collection, id)
    .first<{ data: string }>();
  return row ? (JSON.parse(row.data) as Doc) : null;
}

export async function createDocument(
  env: Env,
  ctx: Ctx,
  name: string,
  request: Request,
): Promise<Response> {
  const reg = lookup(name);
  if (!reg) throw new ApiError("not-found", `Collection « ${name} » inconnue.`);

  const body = stripServerFields((await request.json()) as Doc);
  const id = String(body[reg.idField] ?? crypto.randomUUID());

  if (await loadDocument(env, name, id)) {
    throw new ApiError("failed-precondition", "Ce document existe déjà.");
  }

  const policy = reg.policy(id);
  const decision = policy.create?.(ctx, null, body);
  if (!decision?.allow) {
    throw new ApiError("permission-denied", decision?.reason ?? "Création non autorisée.");
  }

  body[reg.idField] = id;
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO documents (collection, id, data, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
  )
    .bind(name, id, JSON.stringify(body), now)
    .run();

  return json({ ...body, createdAt: { __ts: now }, updatedAt: { __ts: now } }, { status: 201 });
}

/**
 * Mise à jour.
 *
 * ⚠️ `merge` est OBLIGATOIRE avant l'évaluation. Le client envoie un patch
 * partiel (`updateDoc`), mais les règles Firestore évaluaient
 * `request.resource.data`, c'est-à-dire le document RÉSULTANT. Évaluer le patch
 * brut ferait passer tout champ non transmis pour supprimé : `frozen()`
 * refuserait des écritures légitimes, et certains contrôles deviendraient
 * contournables.
 */
export async function updateDocument(
  env: Env,
  ctx: Ctx,
  name: string,
  id: string,
  request: Request,
  mode: "merge" | "replace",
): Promise<Response> {
  const reg = lookup(name);
  if (!reg) throw new ApiError("not-found", `Collection « ${name} » inconnue.`);

  const prev = await loadDocument(env, name, id);
  if (!prev) {
    // `setDoc` sur un document absent est une création.
    if (mode === "replace") return createDocument(env, ctx, name, request);
    throw new ApiError("not-found", "Document introuvable.");
  }

  const patch = stripServerFields((await request.json()) as Doc);
  const next = mode === "merge" ? { ...prev, ...patch } : { ...patch, [reg.idField]: id };

  const policy = reg.policy(id);
  const decision = policy.update?.(ctx, prev, next);
  if (!decision?.allow) {
    throw new ApiError("permission-denied", decision?.reason ?? "Modification non autorisée.");
  }

  const now = Date.now();
  await env.DB.prepare(
    "UPDATE documents SET data = ?1, updated_at = ?2 WHERE collection = ?3 AND id = ?4",
  )
    .bind(JSON.stringify(next), now, name, id)
    .run();

  return json({ ...next, updatedAt: { __ts: now } });
}

export async function deleteDocument(
  env: Env,
  ctx: Ctx,
  name: string,
  id: string,
): Promise<Response> {
  const reg = lookup(name);
  if (!reg) throw new ApiError("not-found", `Collection « ${name} » inconnue.`);

  const prev = await loadDocument(env, name, id);
  if (!prev) throw new ApiError("not-found", "Document introuvable.");

  const policy = reg.policy(id);
  const decision = policy.delete?.(ctx, prev, null);
  if (!decision?.allow) {
    throw new ApiError("permission-denied", decision?.reason ?? "Suppression non autorisée.");
  }

  await env.DB.prepare("DELETE FROM documents WHERE collection = ?1 AND id = ?2")
    .bind(name, id)
    .run();
  return json({ deleted: id });
}

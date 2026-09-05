/**
 * Chargement NDJSON → D1. Étape 3 de la migration.
 *
 * Produit des fichiers SQL idempotents (INSERT … ON CONFLICT DO UPDATE) que
 * `wrangler d1 execute --file` applique. Rejouer le script converge vers le même
 * état ; `created_at` n'est jamais écrasé par une réexécution.
 *
 * Deux corrections de sécurité appliquées au passage, décrites dans le plan :
 *  - `tenants.apiKey` sort du document public et devient une EMPREINTE dans
 *    `tenant_api_keys` (la règle Firestore `allow read: if true` exposait toutes
 *    les clés des bailleurs à n'importe quel visiteur) ;
 *  - `tenants.campaignQuota` sort aussi, vers `tenant_quotas`, pour que sa
 *    réservation tienne en une instruction conditionnelle.
 *
 * Usage : npm run migrate:load        (génère le SQL)
 *         npm run migrate:apply       (applique en distant)
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DOCUMENT_COLLECTIONS } from "./collections";
import { idFieldFor, toDocumentRow, tsToMillis, stripMeta, type RawDoc } from "./transform";

const EXPORT_DIR = join(process.cwd(), ".migration", "export");
const SQL_DIR = join(process.cwd(), ".migration", "sql");
const NOW = Date.now();

/** Poivre des empreintes de clés API. Doit correspondre au secret du Worker. */
const PEPPER = process.env.IMPACT_KEY_PEPPER ?? "";

function read(name: string): RawDoc[] {
  const file = join(EXPORT_DIR, `${name}.ndjson`);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as RawDoc);
}

/** Littéral SQL. `null` distinct de la chaîne vide — les CHECK en dépendent. */
function lit(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  return `'${String(v).replace(/'/g, "''")}'`;
}

const statements: string[] = [];
const report: Record<string, number> = {};
const unresolvedUrls: string[] = [];

/**
 * Carte de réécriture Firebase Storage → R2, produite par
 * scripts/migrate/copy-storage-to-r2.ts. Absente, les URLs sont conservées
 * telles quelles et signalées en fin d'exécution — jamais réécrites au hasard.
 */
const MAP_FILE = join(process.cwd(), ".migration", "storage-url-map.json");
const urlMap = new Map<string, string>(
  existsSync(MAP_FILE)
    ? Object.entries(JSON.parse(readFileSync(MAP_FILE, "utf8")) as Record<string, string>)
    : [],
);

function emit(table: string, sql: string) {
  statements.push(sql);
  report[table] = (report[table] ?? 0) + 1;
}

function upsert(table: string, cols: string[], vals: unknown[], keys: string[]) {
  const updatable = cols.filter((c) => !keys.includes(c) && c !== "created_at");
  const set = updatable.map((c) => `${c} = excluded.${c}`).join(", ");
  emit(
    table,
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${vals.map(lit).join(", ")}) ` +
      `ON CONFLICT(${keys.join(", ")}) DO UPDATE SET ${set};`,
  );
}

// --- documents (les 12 ressources du CMS) ---
//
// ⚠️ Deux champs des tenants sont EXTRAITS puis RETIRÉS de la charge utile.
// `documents` est servi publiquement par l'API générique : les y laisser
// reproduirait à l'identique la fuite de firestore.rules, où
// `match /tenants/{slug} { allow read: if true; }` exposait la clé API de chaque
// bailleur à n'importe quel visiteur.
const TENANT_SENSITIVE = ["apiKey", "campaignQuota"] as const;

for (const collection of DOCUMENT_COLLECTIONS) {
  for (const doc of read(collection)) {
    const sensitive: Record<string, unknown> = {};

    if (collection === "tenants") {
      // Retiré AVANT construction de la ligne, pour qu'aucune charge utile
      // assainie ne dépende d'une correction ultérieure.
      for (const field of TENANT_SENSITIVE) {
        if (doc[field] !== undefined) {
          sensitive[field] = doc[field];
          delete doc[field];
        }
      }
    }

    const row = toDocumentRow(collection, doc, urlMap, unresolvedUrls, idFieldFor(collection), NOW);
    upsert(
      "documents",
      ["collection", "id", "data", "created_at", "updated_at"],
      [row.collection, row.id, row.data, row.created_at, row.updated_at],
      ["collection", "id"],
    );

    if (collection !== "tenants") continue;

    const apiKey = sensitive.apiKey;
    if (typeof apiKey === "string" && apiKey.length > 0) {
      const hash = createHash("sha256").update(`${apiKey}${PEPPER}`).digest("hex");
      upsert(
        "tenant_api_keys",
        ["tenant_slug", "key_hash", "label", "created_at"],
        [row.id, hash, "migré depuis tenants.apiKey", NOW],
        ["tenant_slug", "key_hash"],
      );
    }

    const quota = (sensitive.campaignQuota ?? {}) as Record<string, unknown>;
    upsert(
      "tenant_quotas",
      ["tenant_slug", "campaign_monthly", "campaign_sent", "campaign_period_key", "updated_at"],
      [
        row.id,
        typeof quota.monthly === "number" ? quota.monthly : 1000,
        typeof quota.sentThisMonth === "number" ? quota.sentThisMonth : 0,
        typeof quota.periodKey === "string" ? quota.periodKey : "",
        NOW,
      ],
      ["tenant_slug"],
    );
  }
}

// --- settings ---
for (const doc of read("settings")) {
  upsert(
    "settings",
    ["key", "data", "updated_at"],
    [doc.__id, JSON.stringify(stripMeta(doc)), NOW],
    ["key"],
  );
}

// --- users + centres d'intérêt normalisés ---
for (const doc of read("users")) {
  const d = stripMeta(doc) as Record<string, unknown>;
  const created = tsToMillis(d.createdAt, NOW);
  const coords = d.homeCoords ? JSON.stringify(d.homeCoords) : null;
  const interests = Array.isArray(d.interests) ? (d.interests as string[]) : [];
  upsert(
    "users",
    [
      "uid", "email", "display_name", "photo_url", "role", "status", "region", "phone",
      "language", "interests", "home_coords", "sms_consent", "whatsapp_consent",
      "created_at", "updated_at",
    ],
    [
      doc.__id, d.email ?? null, d.displayName ?? null, d.photoURL ?? null,
      d.role ?? "patient_public", d.status ?? "active", d.region ?? null, d.phone ?? null,
      d.language ?? "fr", JSON.stringify(interests), coords,
      d.smsConsent === true, d.whatsappConsent === true, created, created,
    ],
    ["uid"],
  );
  for (const interest of interests) {
    emit(
      "user_interests",
      `INSERT OR IGNORE INTO user_interests (uid, interest) VALUES (${lit(doc.__id)}, ${lit(interest)});`,
    );
  }
}

// --- auditLogs ---
for (const doc of read("auditLogs")) {
  const d = stripMeta(doc) as Record<string, unknown>;
  emit(
    "audit_logs",
    `INSERT OR IGNORE INTO audit_logs (id, actor_uid, actor_name, action, resource_type, resource_id, resource_title, changes, created_at) VALUES (` +
      [
        doc.__id, d.actorUid ?? "", d.actorName ?? null, d.action ?? "update",
        d.resourceType ?? "", d.resourceId ?? "", d.resourceTitle ?? null,
        d.changes ? JSON.stringify(d.changes) : null, tsToMillis(d.createdAt, NOW),
      ].map(lit).join(", ") +
      `);`,
  );
}

// --- pricingPlans ---
for (const doc of read("pricingPlans")) {
  const d = stripMeta(doc) as Record<string, unknown>;
  upsert(
    "pricing_plans",
    [
      "id", "name", "slug", "description", "line_of_business", "model", "price", "currency",
      "billing_period", "features", "limits", "is_active", "sort_order", "trial_days",
      "created_at", "updated_at",
    ],
    [
      doc.__id, d.name ?? "", d.slug ?? doc.__id, d.description ?? null,
      d.lineOfBusiness ?? "pages", d.model ?? "subscription", d.price ?? 0, d.currency ?? "XOF",
      d.billingPeriod ?? "monthly", JSON.stringify(d.features ?? []),
      d.limits ? JSON.stringify(d.limits) : null, d.isActive !== false,
      typeof d.sortOrder === "number" ? d.sortOrder : 0,
      typeof d.trialDays === "number" ? d.trialDays : null, NOW, NOW,
    ],
    ["id"],
  );
}

// --- tenantReports ---
for (const doc of read("tenantReports")) {
  const d = stripMeta(doc) as Record<string, unknown>;
  const slug = typeof d.tenantSlug === "string" ? d.tenantSlug : String(doc.__id).split("_")[0];
  upsert(
    "tenant_reports",
    ["id", "tenant_slug", "kind", "data", "updated_at"],
    [doc.__id, slug, String(doc.__id).includes("ga4") ? "ga4" : "views", JSON.stringify(d), tsToMillis(d.updatedAt, NOW)],
    ["id"],
  );
}

// --- conversations + participants ---
for (const doc of read("conversations")) {
  const d = stripMeta(doc) as Record<string, unknown>;
  const created = tsToMillis(d.createdAt, NOW);
  upsert(
    "conversations",
    ["id", "kind", "title", "last_message", "last_sender_uid", "created_at", "updated_at"],
    [
      doc.__id, String(doc.__id).startsWith("support_") ? "support" : "direct",
      d.name ?? null, d.lastMessage ?? null, d.lastSenderUid ?? null,
      created, tsToMillis(d.updatedAt, created),
    ],
    ["id"],
  );
  const participants = Array.isArray(d.participants) ? (d.participants as string[]) : [];
  for (const uid of participants) {
    emit(
      "conversation_participants",
      `INSERT OR IGNORE INTO conversation_participants (conversation_id, uid, joined_at) VALUES (${lit(doc.__id)}, ${lit(uid)}, ${lit(created)});`,
    );
  }
}

// --- messages (requête de groupe) ---
for (const doc of read("group__messages")) {
  const d = stripMeta(doc) as Record<string, unknown>;
  const convId = doc.__parentId ?? String(doc.__parent ?? "").split("/")[1] ?? "";
  emit(
    "messages",
    `INSERT OR IGNORE INTO messages (id, conversation_id, sender_uid, text, created_at) VALUES (` +
      [doc.__id, convId, d.senderUid ?? "", d.text ?? "", tsToMillis(d.createdAt, NOW)].map(lit).join(", ") +
      `);`,
  );
}

// --- posts de communauté (requête de groupe) ---
for (const doc of read("group__posts")) {
  const d = stripMeta(doc) as Record<string, unknown>;
  const created = tsToMillis(d.createdAt, NOW);
  const author = (d.author ?? {}) as Record<string, unknown>;
  upsert(
    "community_posts",
    [
      "id", "community_slug", "author_uid", "author_name", "author_role", "content",
      "tags", "likes", "comments", "shares", "created_at", "updated_at",
    ],
    [
      doc.__id, doc.__parentId ?? "", d.authorUid ?? "", author.name ?? "", author.role ?? null,
      d.content ?? "", JSON.stringify(d.tags ?? []), d.likes ?? 0, d.comments ?? 0,
      d.shares ?? 0, created, created,
    ],
    ["id"],
  );
}

// --- sous-collections utilisateur ---
for (const doc of read("users__favorites")) {
  const d = stripMeta(doc) as Record<string, unknown>;
  upsert(
    "user_favorites",
    ["uid", "id", "type", "ref_id", "title", "href", "created_at"],
    [doc.__uid, doc.__id, d.type ?? "", d.refId ?? "", d.title ?? null, d.href ?? null, tsToMillis(d.createdAt, NOW)],
    ["uid", "id"],
  );
}
for (const doc of read("users__memberships")) {
  const d = stripMeta(doc) as Record<string, unknown>;
  upsert(
    "user_community_memberships",
    ["uid", "community_slug", "name", "created_at"],
    [doc.__uid, doc.__id, d.name ?? null, tsToMillis(d.createdAt, NOW)],
    ["uid", "community_slug"],
  );
}
for (const doc of read("users__conversationReads")) {
  const d = stripMeta(doc) as Record<string, unknown>;
  upsert(
    "user_conversation_reads",
    ["uid", "conversation_id", "last_read_at"],
    [doc.__uid, doc.__id, tsToMillis(d.lastReadAt, NOW)],
    ["uid", "conversation_id"],
  );
}

// --- écriture des fichiers SQL, découpés pour rester sous les limites de D1 ---
if (existsSync(SQL_DIR)) rmSync(SQL_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });

const CHUNK = 400;
let part = 0;
for (let i = 0; i < statements.length; i += CHUNK) {
  part++;
  const name = `${String(part).padStart(3, "0")}.sql`;
  writeFileSync(join(SQL_DIR, name), `${statements.slice(i, i + CHUNK).join("\n")}\n`);
}

console.log("=== Lignes générées par table ===");
for (const [table, n] of Object.entries(report).sort()) {
  console.log(`  ${table.padEnd(30)} ${String(n).padStart(5)}`);
}
console.log(`\n  ${statements.length} instructions → ${part} fichier(s) dans ${SQL_DIR}`);

if (unresolvedUrls.length > 0) {
  const unique = [...new Set(unresolvedUrls)];
  writeFileSync(
    join(SQL_DIR, "..", "unresolved-urls.json"),
    `${JSON.stringify(unique, null, 2)}\n`,
  );
  console.log(
    `\n⚠️  ${unique.length} URL(s) Firebase Storage conservées telles quelles ` +
      `(projet tiers eyone-medical, toujours valides) — à rapatrier dans R2 au Lot 3.`,
  );
}
if (!PEPPER) {
  console.log(
    "\n⚠️  IMPACT_KEY_PEPPER absent : les empreintes de clés API sont calculées sans poivre.\n" +
      "    Définir le secret côté Worker puis relancer pour les recalculer.",
  );
}

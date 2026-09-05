/**
 * Vérification de parité Firestore ↔ D1. Étape 4 (et porte de bascule).
 *
 * Compare l'export NDJSON à l'état réel de D1 : nombres de lignes ET égalité des
 * ensembles d'identifiants. Le volume est petit (~900 documents), donc le
 * ré-export complet est une primitive de vérification viable — inutile de bâtir
 * une synchronisation incrémentale.
 *
 * ⚠️ Ce contrôle ne suffit PAS à lui seul pour basculer une collection : il
 * détecte les écarts de DONNÉES, pas les écarts de FORME DE REQUÊTE
 * (`published !== false`, array-contains, pagination par horodatage,
 * troncature à limit(500)). Ceux-là ne se voient qu'en lectures fantômes sur du
 * trafic réel, conformément au plan.
 *
 * Usage : npm run migrate:verify
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DOCUMENT_COLLECTIONS } from "./collections";

const EXPORT_DIR = join(process.cwd(), ".migration", "export");
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const DB_ID = process.env.D1_DATABASE_ID ?? "";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";

async function query<T>(sql: string): Promise<T[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB_ID}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    },
  );
  const body = (await res.json()) as {
    success: boolean;
    errors?: { message: string }[];
    result?: { results: T[] }[];
  };
  if (!body.success) throw new Error(body.errors?.map((e) => e.message).join("; ") ?? "échec D1");
  return body.result?.[0]?.results ?? [];
}

function exportedIds(name: string): string[] {
  const file = join(EXPORT_DIR, `${name}.ndjson`);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => (JSON.parse(l) as { __id: string }).__id);
}

interface Check {
  label: string;
  source: number;
  target: number;
  missing: string[];
  extra: string[];
}

async function checkDocuments(): Promise<Check[]> {
  const checks: Check[] = [];
  for (const collection of DOCUMENT_COLLECTIONS) {
    const src = exportedIds(collection);
    const rows = await query<{ id: string }>(
      `SELECT id FROM documents WHERE collection = '${collection}'`,
    );
    const tgt = rows.map((r) => r.id);
    const s = new Set(src);
    const t = new Set(tgt);
    checks.push({
      label: `documents/${collection}`,
      source: src.length,
      target: tgt.length,
      missing: src.filter((id) => !t.has(id)),
      extra: tgt.filter((id) => !s.has(id)),
    });
  }
  return checks;
}

/** Collections de premier niveau adossées à une table typée. */
const TABLE_MAP: Record<string, { table: string; key: string }> = {
  users: { table: "users", key: "uid" },
  auditLogs: { table: "audit_logs", key: "id" },
  pricingPlans: { table: "pricing_plans", key: "id" },
  tenantReports: { table: "tenant_reports", key: "id" },
  conversations: { table: "conversations", key: "id" },
  settings: { table: "settings", key: "key" },
};

async function checkTables(): Promise<Check[]> {
  const checks: Check[] = [];
  for (const [collection, { table, key }] of Object.entries(TABLE_MAP)) {
    const src = exportedIds(collection);
    const rows = await query<Record<string, string>>(`SELECT ${key} FROM ${table}`);
    const tgt = rows.map((r) => r[key]);
    const s = new Set(src);
    const t = new Set(tgt);
    checks.push({
      label: table,
      source: src.length,
      target: tgt.length,
      missing: src.filter((id) => !t.has(id)),
      extra: tgt.filter((id) => !s.has(id)),
    });
  }
  return checks;
}

async function main() {
  if (!ACCOUNT || !DB_ID || !TOKEN) {
    console.error(
      "❌ CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID et CLOUDFLARE_API_TOKEN sont requis.",
    );
    process.exit(1);
  }
  const checks = [...(await checkDocuments()), ...(await checkTables())];

  let failures = 0;
  console.log("  collection / table                 source  cible  état");
  console.log("  " + "-".repeat(60));
  for (const c of checks) {
    const ok = c.source === c.target && c.missing.length === 0 && c.extra.length === 0;
    if (!ok) failures++;
    console.log(
      `  ${c.label.padEnd(34)} ${String(c.source).padStart(5)} ${String(c.target).padStart(6)}  ${ok ? "✅" : "❌"}`,
    );
    if (c.missing.length) console.log(`      manquants en D1 : ${c.missing.slice(0, 5).join(", ")}${c.missing.length > 5 ? "…" : ""}`);
    if (c.extra.length) console.log(`      en trop en D1   : ${c.extra.slice(0, 5).join(", ")}${c.extra.length > 5 ? "…" : ""}`);
  }

  const orphanUrls = await query<{ n: number }>(
    "SELECT count(*) AS n FROM documents WHERE data LIKE '%firebasestorage%'",
  );
  console.log(`\n  URLs Firebase Storage restantes : ${orphanUrls[0]?.n ?? 0}`);

  console.log(
    failures === 0
      ? "\n✅ Parité intégrale — comptes et ensembles d'identifiants identiques."
      : `\n❌ ${failures} écart(s) : ne basculer AUCUNE de ces collections.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("❌ vérification interrompue :", err);
  process.exit(1);
});

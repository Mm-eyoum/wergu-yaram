/**
 * Export Firestore → NDJSON, étape 1 de la migration vers D1.
 *
 * Lecture SEULE : ce script ne modifie jamais Firestore.
 *
 * ⚠️ On n'utilise PAS `snap.data()` tel quel ni `toJSON()` : les types Firestore
 * (Timestamp, GeoPoint, DocumentReference, Bytes) se sérialisent mal ou
 * perdent leur nature. L'encodeur ci-dessous est explicite, pour que la
 * transformation en aval sache exactement ce qu'elle lit.
 *
 * Usage : npm run migrate:export
 * Auth  : GOOGLE_APPLICATION_CREDENTIALS (ADC gcloud accepté) + GOOGLE_CLOUD_PROJECT
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, appendFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, Timestamp, GeoPoint, type Firestore } from "firebase-admin/firestore";
import {
  ALL_TOP_LEVEL,
  GROUP_SUBCOLLECTIONS,
  SKIPPED_COLLECTIONS,
  USER_SUBCOLLECTIONS,
} from "./collections";

const OUT_DIR = join(process.cwd(), ".migration", "export");

/** Encodeur explicite des types Firestore vers du JSON sans perte. */
function encode(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Timestamp) return { __ts: value.toMillis() };
  if (value instanceof GeoPoint) return { lat: value.latitude, lng: value.longitude };
  if (Buffer.isBuffer(value)) return { __bytes: value.toString("base64") };
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(encode);
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    // DocumentReference : on ne garde que le chemin.
    if (typeof v.path === "string" && typeof (v as { firestore?: unknown }).firestore === "object") {
      return { __ref: v.path };
    }
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = encode(val);
    return out;
  }
  return value;
}

interface FileStat {
  file: string;
  count: number;
  sha256: string;
}

function writeNdjson(name: string, rows: unknown[]): FileStat {
  const file = join(OUT_DIR, `${name}.ndjson`);
  writeFileSync(file, "");
  const hash = createHash("sha256");
  for (const row of rows) {
    const line = `${JSON.stringify(row)}\n`;
    appendFileSync(file, line);
    hash.update(line);
  }
  return { file: `${name}.ndjson`, count: rows.length, sha256: hash.digest("hex") };
}

async function exportCollection(db: Firestore, name: string): Promise<FileStat> {
  const snap = await db.collection(name).get();
  const rows = snap.docs.map((d) => ({ __id: d.id, __parent: name, ...(encode(d.data()) as object) }));
  return writeNdjson(name, rows);
}

/** Sous-collections users/{uid}/… — parcourues par utilisateur. */
async function exportUserSubcollections(db: Firestore): Promise<FileStat[]> {
  const buckets = new Map<string, unknown[]>();
  for (const sub of USER_SUBCOLLECTIONS) buckets.set(sub, []);

  const userRefs = await db.collection("users").listDocuments();
  for (const userRef of userRefs) {
    const subs = await userRef.listCollections();
    for (const sub of subs) {
      if (!buckets.has(sub.id)) continue; // sous-collection inattendue : signalée plus bas
      const snap = await sub.get();
      for (const d of snap.docs) {
        buckets.get(sub.id)!.push({
          __id: d.id,
          __parent: `users/${userRef.id}/${sub.id}`,
          __uid: userRef.id,
          ...(encode(d.data()) as object),
        });
      }
    }
  }
  return [...buckets].map(([name, rows]) => writeNdjson(`users__${name}`, rows));
}

/** Sous-collections atteintes par requête de groupe (posts, messages). */
async function exportGroups(db: Firestore): Promise<FileStat[]> {
  const stats: FileStat[] = [];
  for (const { group } of GROUP_SUBCOLLECTIONS) {
    const snap = await db.collectionGroup(group).get();
    const rows = snap.docs.map((d) => ({
      __id: d.id,
      __parent: d.ref.parent.path,
      __parentId: d.ref.parent.parent?.id ?? null,
      ...(encode(d.data()) as object),
    }));
    stats.push(writeNdjson(`group__${group}`, rows));
  }
  return stats;
}

async function main() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? "werguyaram";
  const app: App = initializeApp({ credential: applicationDefault(), projectId });
  const db = getFirestore(app);

  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const stats: FileStat[] = [];
  for (const name of ALL_TOP_LEVEL) {
    const stat = await exportCollection(db, name);
    stats.push(stat);
    console.log(`  ${name.padEnd(34)} ${String(stat.count).padStart(5)} documents`);
  }

  console.log("  — sous-collections utilisateur —");
  for (const stat of await exportUserSubcollections(db)) {
    stats.push(stat);
    console.log(`  ${stat.file.replace(".ndjson", "").padEnd(34)} ${String(stat.count).padStart(5)}`);
  }

  console.log("  — requêtes de groupe —");
  for (const stat of await exportGroups(db)) {
    stats.push(stat);
    console.log(`  ${stat.file.replace(".ndjson", "").padEnd(34)} ${String(stat.count).padStart(5)}`);
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    projectId,
    skipped: SKIPPED_COLLECTIONS,
    files: stats,
    totalDocuments: stats.reduce((n, s) => n + s.count, 0),
  };
  writeFileSync(join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n✅ ${manifest.totalDocuments} documents exportés vers ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("❌ export interrompu :", err);
  process.exit(1);
});

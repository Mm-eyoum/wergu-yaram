/**
 * Firebase Storage → R2. Étape « fichiers » de la migration.
 *
 * Les objets sont copiés à la clé IDENTIQUE : `media.storagePath` est déjà
 * stocké dans chaque document, et le conserver tel quel évite toute réécriture
 * de ce champ. Seule la BASE de l'URL publique change.
 *
 * ⚠️ Ce script ne SUPPRIME jamais la source. Le `?token=` d'une URL
 * `getDownloadURL` est invalidé dès que l'objet est supprimé : la suppression
 * est l'étape irréversible, à ne faire qu'après un crawl complet du site.
 *
 * Usage : npm run migrate:storage            (inventaire seul)
 *         npm run migrate:storage -- --apply (copie effective)
 */
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const APPLY = process.argv.includes("--apply");
const OUT_DIR = join(process.cwd(), ".migration");

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
const BUCKET = process.env.R2_BUCKET ?? "werguyaram-media";
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE ?? "https://media.werguyaram.org";

/**
 * URL publique d'un objet R2.
 *
 * Les segments sont encodés : plusieurs clés contiennent des espaces
 * (« Team Eyone.png »), qui casseraient un attribut `src` ou `href` en HTML.
 * Le Worker fait le `decodeURIComponent` symétrique à la lecture.
 */
function publicUrl(key: string): string {
  return `${R2_PUBLIC_BASE}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

interface Entry {
  key: string;
  size: number;
  contentType: string;
  firebaseUrl: string | null;
  r2Url: string;
}

/** Au-delà, l'API REST à un seul appel échoue : on passe par wrangler, qui découpe. */
const REST_MAX_BYTES = 20 * 1024 * 1024;

async function putToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  if (body.byteLength <= REST_MAX_BYTES) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": contentType },
        body: new Uint8Array(body),
      },
    );
    if (!res.ok) throw new Error(`R2 PUT ${key} → HTTP ${res.status} ${await res.text()}`);
    return;
  }

  // Gros objet : fichier temporaire + wrangler (téléversement par morceaux).
  const tmp = join(tmpdir(), `wy-r2-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  writeFileSync(tmp, body);
  try {
    execFileSync(
      "npx",
      ["--yes", "wrangler@4", "r2", "object", "put", `${BUCKET}/${key}`,
       "--file", tmp, "--content-type", contentType, "--remote"],
      { stdio: "pipe", env: process.env },
    );
  } finally {
    rmSync(tmp, { force: true });
  }
}

/**
 * Rapatrie un asset désigné par une URL de téléchargement publique.
 *
 * Les deux images réellement utilisées (logo et bannière du tenant `eyone`)
 * vivent dans un AUTRE projet Firebase (`eyone-medical`). Les copier ici
 * supprime une dépendance croisée que rien ne documentait.
 */
async function copyExternal(url: string, key: string): Promise<Entry | null> {
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`   ⚠️  ${key} : source HTTP ${res.status} — ignoré`);
    return null;
  }
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`   ${(buf.byteLength / 1024).toFixed(1).padStart(9)} Ko  ${contentType.padEnd(16)} ${key}  (externe)`);
  if (APPLY) {
    await putToR2(key, buf, contentType);
    console.log("      → copié dans R2");
  }
  return { key, size: buf.byteLength, contentType, firebaseUrl: url, r2Url: publicUrl(key) };
}

async function main() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? "werguyaram";
  const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("VITE_FIREBASE_STORAGE_BUCKET absent");

  initializeApp({ credential: applicationDefault(), projectId, storageBucket: bucketName });
  const bucket = getStorage().bucket(bucketName);
  const [files] = await bucket.getFiles();

  console.log(`  ${files.length} objet(s) dans ${bucketName}`);
  const entries: Entry[] = [];
  let bytes = 0;

  for (const f of files) {
    const size = Number(f.metadata.size ?? 0);
    const contentType = String(f.metadata.contentType ?? "application/octet-stream");
    const token = (f.metadata.metadata as Record<string, string> | undefined)?.firebaseStorageDownloadTokens;
    bytes += size;
    entries.push({
      key: f.name,
      size,
      contentType,
      firebaseUrl: token
        ? `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(f.name)}?alt=media&token=${token.split(",")[0]}`
        : null,
      r2Url: publicUrl(f.name),
    });
    console.log(`   ${(size / 1024).toFixed(1).padStart(9)} Ko  ${contentType.padEnd(16)} ${f.name}`);

    if (APPLY) {
      if (!ACCOUNT || !TOKEN) throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN requis pour --apply");
      const [buf] = await f.download();
      await putToR2(f.name, buf, contentType);
      console.log(`      → copié dans R2`);
    }
  }

  console.log(`  total : ${(bytes / 1024 / 1024).toFixed(2)} Mo`);

  // Assets référencés par les documents mais hébergés hors du projet.
  const external = JSON.parse(
    process.env.EXTERNAL_ASSETS ?? "[]",
  ) as { url: string; key: string }[];
  if (external.length) {
    console.log(`  ${external.length} asset(s) externe(s) référencé(s) par les documents :`);
    for (const a of external) {
      const entry = await copyExternal(a.url, a.key);
      if (entry) entries.push(entry);
    }
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const map = Object.fromEntries(entries.filter((e) => e.firebaseUrl).map((e) => [e.firebaseUrl as string, e.r2Url]));
  writeFileSync(join(OUT_DIR, "storage-url-map.json"), `${JSON.stringify(map, null, 2)}\n`);
  console.log(`  carte de réécriture : ${Object.keys(map).length} URL(s) → .migration/storage-url-map.json`);
  console.log(APPLY ? "\n✅ copie effectuée (source INTACTE)" : "\nℹ︎ inventaire seul — relancer avec --apply pour copier");
}

main().catch((err) => {
  console.error("❌", err.message ?? err);
  process.exit(1);
});

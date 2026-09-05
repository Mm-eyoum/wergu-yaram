/**
 * Déploiement Firebase Hosting via l'API REST.
 *
 * POURQUOI CE SCRIPT EXISTE
 * `firebase-tools` s'authentifie avec sa propre session ; sur cette machine elle
 * appartient à un compte (`rys.digi@gmail.com`) qui n'a PAS accès au projet
 * `werguyaram`. Les identifiants ADC de gcloud, eux, y ont accès — mais le CLI
 * ne sait pas les utiliser pour un compte utilisateur (il n'accepte que les
 * comptes de service). On parle donc directement à l'API.
 *
 * ⚠️ Ce script est TRANSITOIRE : il disparaît quand l'hébergement passe sur
 * Cloudflare (Lot 1 du plan), ce qui supprimera du même coup ce problème
 * d'identifiants.
 *
 * La configuration de service (réécritures, en-têtes, CSP, cleanUrls) est
 * transmise dans la version : l'omettre déploierait un site SANS CSP ni
 * réécriture SPA — toutes les routes profondes renverraient 404.
 */
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const PROJECT = process.env.FIREBASE_PROJECT ?? "werguyaram";
const SITE = process.env.FIREBASE_SITE ?? "werguyaram";
const DIST = join(process.cwd(), "dist");
const API = "https://firebasehosting.googleapis.com/v1beta1";

async function accessToken() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) throw new Error("GOOGLE_APPLICATION_CREDENTIALS absent");
  const c = JSON.parse(readFileSync(path, "utf8"));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.client_id,
      client_secret: c.client_secret,
      refresh_token: c.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json();
  if (!body.access_token) throw new Error(`OAuth: ${JSON.stringify(body)}`);
  return body.access_token;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Config de service dérivée de firebase.json, au format attendu par l'API. */
function servingConfig() {
  const fb = JSON.parse(readFileSync(join(process.cwd(), "firebase.json"), "utf8")).hosting;
  return {
    headers: (fb.headers ?? []).map((h) => ({
      glob: h.source,
      headers: Object.fromEntries(h.headers.map((x) => [x.key, x.value])),
    })),
    rewrites: (fb.rewrites ?? []).map((r) =>
      r.function
        ? { glob: r.source, function: r.function.functionId, functionRegion: r.function.region }
        : { glob: r.source, path: r.destination },
    ),
    cleanUrls: fb.cleanUrls ?? false,
    trailingSlashBehavior: fb.trailingSlash === false ? "REMOVE" : "ADD",
  };
}

async function api(token, path, init = {}) {
  const res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const token = await accessToken();

  console.log(`  site ${SITE} (projet ${PROJECT})`);
  const version = await api(token, `/sites/${SITE}/versions`, {
    method: "POST",
    body: JSON.stringify({ config: servingConfig() }),
  });
  console.log(`  version créée : ${version.name}`);

  // Chaque fichier est gzippé ; l'API indexe par SHA-256 du CONTENU COMPRESSÉ.
  const files = walk(DIST);
  const byHash = new Map();
  const manifest = {};
  for (const full of files) {
    const gz = gzipSync(readFileSync(full), { level: 9 });
    const hash = createHash("sha256").update(gz).digest("hex");
    const urlPath = "/" + relative(DIST, full).split(sep).join("/");
    manifest[urlPath] = hash;
    if (!byHash.has(hash)) byHash.set(hash, gz);
  }
  console.log(`  ${files.length} fichiers · ${byHash.size} contenus distincts`);

  const populated = await api(token, `/${version.name}:populateFiles`, {
    method: "POST",
    body: JSON.stringify({ files: manifest }),
  });
  const required = populated.uploadRequiredHashes ?? [];
  console.log(`  ${required.length} à téléverser`);

  let done = 0;
  const CONCURRENCY = 12;
  const queue = [...required];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const hash = queue.pop();
        const res = await fetch(`${populated.uploadUrl}/${hash}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
          body: byHash.get(hash),
        });
        if (!res.ok) throw new Error(`upload ${hash} → ${res.status} ${await res.text()}`);
        if (++done % 200 === 0) console.log(`    ${done}/${required.length}`);
      }
    }),
  );
  console.log(`  ${done} fichiers téléversés`);

  await api(token, `/${version.name}?updateMask=status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "FINALIZED" }),
  });
  const release = await api(token, `/sites/${SITE}/releases?versionName=${version.name}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  console.log(`\n✅ publié : ${release.name}`);
  console.log(`   https://${SITE}.web.app`);
}

main().catch((err) => {
  console.error("❌ déploiement interrompu :", err.message);
  process.exit(1);
});

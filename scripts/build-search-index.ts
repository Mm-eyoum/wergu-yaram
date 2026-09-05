/**
 * Génère l'index de recherche statique pour le moteur in-browser (Orama).
 *
 * Remplace l'usage de Typesense Cloud : au lieu de pousser vers un service
 * facturé, on écrit `public/search-index.json` (tableau de SearchHit complet,
 * facets incluses) servi par Firebase Hosting. Le client charge ce JSON et
 * construit l'index Orama côté navigateur (voir src/services/searchIndex.ts).
 *
 * À lancer côté serveur/CI, avant le build/déploiement :
 *   node --env-file=.env.local --import tsx scripts/build-search-index.ts
 *
 * Lit le catalogue en direct dans Firestore quand GOOGLE_APPLICATION_CREDENTIALS
 * est défini ; sinon repli sur le contenu mock bundlé (l'indexeur ne plante pas).
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSearchHits, mockSearchContent } from "../src/data/mockSearchIndex";
import { getCatalogHandle as getDb, fetchLiveCatalog, fetchActiveOrgHits } from "./lib/catalogSource";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "search-index.json");

async function main() {
  const db = getDb();
  const content = (await fetchLiveCatalog(db)) ?? (await mockSearchContent());
  const contentHits = buildSearchHits(content);
  const orgHits = await fetchActiveOrgHits(db);
  if (orgHits.length) console.log(`✓ ${orgHits.length} organisation(s) ajoutée(s) à l'index`);

  const docs = [...contentHits, ...orgHits];
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(docs), "utf8");

  const byType = docs.reduce<Record<string, number>>((acc, h) => {
    acc[h.type] = (acc[h.type] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`✓ ${docs.length} documents écrits dans public/search-index.json`);
  console.log("  par type :", byType);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

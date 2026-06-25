/**
 * Indexe le contenu dans Typesense (collection "content").
 *
 * Utilise une clé ADMIN (jamais exposée au client). À lancer côté serveur/CI :
 *   node --env-file=.env.local --import tsx scripts/typesense-index.ts
 *
 * Variables attendues :
 *   TYPESENSE_HOST, TYPESENSE_PORT (def. 443), TYPESENSE_PROTOCOL (def. https),
 *   TYPESENSE_ADMIN_KEY, TYPESENSE_COLLECTION (def. content)
 *
 * Source d'indexation : le contenu du catalogue + les `organizations` actives
 * (annuaire importé/créé). Le contenu est lu **en direct dans Firestore** via
 * l'Admin SDK quand GOOGLE_APPLICATION_CREDENTIALS est défini (donc les pages
 * créées/éditées au CMS sont indexées) ; sinon repli sur le contenu mock bundlé.
 */
import Typesense from "typesense";
import { buildSearchHits, mockSearchContent } from "../src/data/mockSearchIndex";
import { getDb, fetchLiveCatalog, fetchActiveOrgHits } from "./lib/firestoreCatalog";

const COLLECTION = process.env.TYPESENSE_COLLECTION ?? "content";

const adminKey = process.env.TYPESENSE_ADMIN_KEY;
const host = process.env.TYPESENSE_HOST;
if (!adminKey || !host) {
  console.error("TYPESENSE_HOST et TYPESENSE_ADMIN_KEY sont requis.");
  process.exit(1);
}

const client = new Typesense.Client({
  nodes: [
    {
      host,
      port: Number(process.env.TYPESENSE_PORT ?? 443),
      protocol: process.env.TYPESENSE_PROTOCOL ?? "https",
    },
  ],
  apiKey: adminKey,
  connectionTimeoutSeconds: 10,
});

const schema = {
  name: COLLECTION,
  fields: [
    { name: "type", type: "string", facet: true },
    { name: "title", type: "string" },
    { name: "description", type: "string" },
    { name: "keywords", type: "string" },
    { name: "href", type: "string", index: false, optional: true },
    { name: "meta", type: "string", index: false, optional: true },
    { name: "badge", type: "string", index: false, optional: true },
    { name: "thumbnail", type: "string", index: false, optional: true },
    { name: "verified", type: "bool", facet: true, optional: true },
  ],
} as const;

async function main() {
  // Recreate the collection for a clean reindex.
  try {
    await client.collections(COLLECTION).delete();
    console.log(`↺ collection "${COLLECTION}" supprimée`);
  } catch {
    /* collection absente — OK */
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await client.collections().create(schema as any);
  console.log(`✓ collection "${COLLECTION}" créée`);

  const db = getDb();
  const content = (await fetchLiveCatalog(db)) ?? (await mockSearchContent());
  const contentHits = buildSearchHits(content);
  const orgHits = await fetchActiveOrgHits(db);
  if (orgHits.length) console.log(`✓ ${orgHits.length} organisation(s) ajoutée(s) à l'index`);
  const docs = [...contentHits.map((hit) => ({ ...hit })), ...orgHits];
  const result = await client.collections(COLLECTION).documents().import(docs, { action: "upsert" });
  const failures = result.filter((r) => !r.success);
  console.log(`✓ ${docs.length - failures.length}/${docs.length} documents indexés`);
  if (failures.length) {
    console.error("Échecs :", failures.slice(0, 5));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

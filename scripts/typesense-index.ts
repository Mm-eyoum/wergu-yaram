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
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  buildSearchHits,
  mockSearchContent,
  type SearchContent,
} from "../src/data/mockSearchIndex";

interface IndexHit {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
  meta?: string;
  verified?: boolean;
  badge?: string;
  keywords: string;
}

/** Init the Admin SDK once; returns null when credentials are absent. */
function getDb(): Firestore | null {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) return null;
  if (getApps().length === 0) initializeApp({ credential: applicationDefault() });
  return getFirestore();
}

/** A document is public unless explicitly unpublished in the CMS. */
function isPublic(data: Record<string, unknown>): boolean {
  return data.published !== false;
}

/**
 * Read the catalog collections live from Firestore. Returns null without
 * credentials (or on error) so the caller falls back to the bundled mock — the
 * indexer never crashes.
 */
async function fetchLiveCatalog(db: Firestore | null): Promise<SearchContent | null> {
  if (!db) {
    console.log("ℹ︎ GOOGLE_APPLICATION_CREDENTIALS absent → contenu mock indexé");
    return null;
  }
  try {
    const read = async (name: string) => {
      const snap = await db.collection(name).get();
      return snap.docs.map((d) => d.data() as Record<string, unknown>).filter(isPublic);
    };
    const [medications, pathologies, articles, facilities, communities, events, equipmentNeeds, partners] =
      await Promise.all([
        read("medications"),
        read("pathologies"),
        read("articles"),
        read("facilities"),
        read("communities"),
        read("events"),
        read("equipmentNeeds"),
        read("partners"),
      ]);
    const content = {
      medications,
      pathologies,
      articles,
      facilities,
      communities,
      events,
      equipmentNeeds,
      partners,
    } as unknown as SearchContent;
    const total = Object.values(content).reduce((n, list) => n + (list as unknown[]).length, 0);
    if (total === 0) {
      console.log("ℹ︎ Firestore vide → contenu mock indexé");
      return null;
    }
    console.log(`✓ contenu Firestore chargé (${total} documents)`);
    return content;
  } catch (err) {
    console.log(`ℹ︎ Firestore inaccessible (${(err as Error)?.message ?? err}) → contenu mock indexé`);
    return null;
  }
}

/** Active organization "pages" as search hits. */
async function fetchActiveOrgHits(db: Firestore | null): Promise<IndexHit[]> {
  if (!db) {
    console.log("ℹ︎ GOOGLE_APPLICATION_CREDENTIALS absent → organisations non indexées");
    return [];
  }
  const snap = await db.collection("organizations").where("status", "==", "active").get();
  return snap.docs.map((doc) => {
    const o = doc.data() as Record<string, unknown>;
    const isFacility = o.type === "healthcare_facility";
    const place = [o.city, o.region].filter(Boolean).join(", ");
    const claimed = o.claimStatus === "claimed";
    return {
      id: `org:${doc.id}`,
      type: isFacility ? "etablissement" : "partenaire",
      title: (o.name as string) ?? "",
      description: (o.description as string) || (o.address as string) || place,
      href: `/structures/${doc.id}`,
      meta: place,
      verified: claimed,
      badge: claimed ? "Annuaire" : "Non réclamée",
      keywords: [o.name, o.city, o.region, o.address].filter(Boolean).join(" "),
    };
  });
}

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

/**
 * Index de recherche in-browser (Orama).
 *
 * Charge `/search-index.json` (généré par scripts/build-search-index.ts depuis
 * Firestore) une seule fois, construit un index Orama plein-texte sur
 * title/keywords/description, et renvoie des `SearchHit[]` — exactement le même
 * contrat que l'ancien chemin Typesense (le faceting/tri/pagination restent
 * côté page). Remplace Typesense Cloud sans coût récurrent.
 *
 * Orama n'indexe que les champs texte ; on conserve une map clé→SearchHit pour
 * restituer le hit complet (facets incluses) après la recherche.
 */
import type { SearchHit } from "@/types/domain";

const INDEX_URL = "/search-index.json";
const MAX = 1000; // parité avec l'ancien plafond Typesense (≈ CATALOG_PAGE_SIZE)

interface BuiltIndex {
  hits: SearchHit[];
  byKey: Map<string, SearchHit>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  search: typeof import("@orama/orama").search;
}

let buildPromise: Promise<BuiltIndex> | null = null;

function keyOf(h: SearchHit): string {
  return (h as SearchHit & { id?: string }).id ?? h.href;
}

async function loadHits(): Promise<SearchHit[]> {
  const res = await fetch(INDEX_URL, { cache: "force-cache" });
  if (!res.ok) throw new Error(`search-index.json: ${res.status}`);
  return (await res.json()) as SearchHit[];
}

async function buildIndex(): Promise<BuiltIndex> {
  const { create, insertMultiple, search } = await import("@orama/orama");
  const hits = await loadHits();
  const byKey = new Map<string, SearchHit>();
  const db = await create({
    schema: { key: "string", title: "string", keywords: "string", description: "string" },
  });
  const docs = hits.map((h) => {
    const key = keyOf(h);
    byKey.set(key, h);
    return {
      key,
      title: h.title ?? "",
      keywords: h.keywords ?? "",
      description: h.description ?? "",
    };
  });
  await insertMultiple(db, docs);
  return { hits, byKey, db, search };
}

/** Construit (ou réutilise) l'index. Lazy : payé au premier search seulement. */
function getIndex(): Promise<BuiltIndex> {
  if (!buildPromise) buildPromise = buildIndex();
  return buildPromise;
}

/**
 * Renvoie tous les hits pour une requête. Requête vide / "*" → corpus complet
 * (browse). Sinon recherche plein-texte Orama, ordonnée par pertinence.
 */
export async function getLocalHits(query: string): Promise<SearchHit[]> {
  const { hits, byKey, db, search } = await getIndex();
  const q = query.trim();
  if (!q || q === "*") return hits.slice(0, MAX);

  const res = await search(db, {
    term: q,
    properties: ["title", "keywords", "description"],
    boost: { title: 3, keywords: 2 },
    limit: MAX,
    tolerance: 1,
  });

  const out: SearchHit[] = [];
  const seen = new Set<string>();
  for (const r of res.hits) {
    const key = (r.document as { key: string }).key;
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = byKey.get(key);
    if (hit) out.push(hit);
  }
  return out;
}

/**
 * Routes de lecture agrégées — Lot 2.
 *
 * Leur raison d'être est la latence : depuis Dakar, chaque aller-retour coûte
 * 150-250 ms. Le gain de la migration ne vient pas du placement de la base
 * (Cloudflare n'a pas de région D1 en Afrique) mais de l'EFFONDREMENT du nombre
 * d'allers-retours. `siteConfig.ts` en fait 6 au démarrage ; ici, un seul.
 */
import type { Env } from "../auth/context";
import { json } from "../lib/http";
import { DOCUMENT_COLLECTIONS } from "../db/registry";

/**
 * Les 6 documents de configuration en UNE réponse, mise en cache au edge.
 * Remplace les `getDoc(settings/site|navigation|appearance|redirects|emails|legal)`
 * séparés de src/services/siteConfig.ts.
 */
export async function getSettings(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT key, data FROM settings").all<{
    key: string;
    data: string;
  }>();
  const out: Record<string, unknown> = {};
  for (const row of results ?? []) out[row.key] = JSON.parse(row.data);
  return json(out, {
    headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
  });
}

/**
 * Catalogue complet publié, en une réponse.
 *
 * Consommé par le pipeline de build (index de recherche Orama, prerender SEO,
 * sitemap, images OG) via scripts/lib/d1Catalog.ts.
 *
 * ⚠️ Point important : aujourd'hui le build lit Firestore par un chemin de code
 * DIFFÉRENT de celui de l'application (scripts/lib/firestoreCatalog.ts), d'où
 * l'avertissement en gras de DEPLOYMENT.md sur le contenu fictif qui fuit dans le
 * HTML de production. En lisant le même endpoint que l'app, cette divergence
 * devient structurellement impossible.
 */
export async function exportCatalog(env: Env): Promise<Response> {
  const placeholders = DOCUMENT_COLLECTIONS.map(() => "?").join(", ");
  const { results } = await env.DB.prepare(
    `SELECT collection, id, data, created_at, updated_at
       FROM documents
      WHERE collection IN (${placeholders})
        AND published = 1
        AND deleted_at IS NULL
      ORDER BY collection, sort_title`,
  )
    .bind(...DOCUMENT_COLLECTIONS)
    .all<{ collection: string; id: string; data: string; created_at: number; updated_at: number }>();

  const out: Record<string, unknown[]> = {};
  for (const c of DOCUMENT_COLLECTIONS) out[c] = [];
  for (const row of results ?? []) {
    out[row.collection]?.push({
      ...JSON.parse(row.data),
      createdAt: { __ts: row.created_at },
      updatedAt: { __ts: row.updated_at },
    });
  }
  return json(
    { generatedAt: new Date().toISOString(), collections: out },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}

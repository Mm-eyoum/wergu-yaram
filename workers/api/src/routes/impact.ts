/**
 * API d'impact — intégration SI des bailleurs.
 *
 * DEUX CORRECTIFS PAR RAPPORT À LA CLOUD FUNCTION
 *
 * 1. La clé n'est plus comparée en clair. Elle était stockée dans
 *    `tenants/{slug}.apiKey`, un document dont firestore.rules déclarait
 *    `allow read: if true` — n'importe quel visiteur pouvait lire TOUTES les
 *    clés des bailleurs avec un seul getDoc. Elle est désormais hachée dans une
 *    table séparée, jamais jointe à la charge utile publique.
 * 2. La comparaison est à temps constant (l'originale utilisait `!==`).
 *
 * L'URL et le format de réponse sont préservés au bit près : aucun bailleur
 * déjà intégré n'a à changer quoi que ce soit.
 */
import type { Env } from "../auth/context";
import { ApiError, json } from "../lib/http";

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function impactApi(env: Env, request: Request, url: URL): Promise<Response> {
  const slug = url.searchParams.get("tenant");
  if (!slug) throw new ApiError("invalid-argument", "Paramètre « tenant » requis.");

  const key = url.searchParams.get("key") ?? request.headers.get("x-api-key") ?? "";
  if (!key) throw new ApiError("unauthenticated", "Clé API requise.");

  const tenant = await env.DB.prepare(
    "SELECT id FROM documents WHERE collection = 'tenants' AND id = ?1",
  )
    .bind(slug)
    .first<{ id: string }>();
  if (!tenant) throw new ApiError("not-found", "Espace partenaire inconnu.");

  const hash = await sha256Hex(`${key}${env.IMPACT_KEY_PEPPER ?? ""}`);
  const match = await env.DB.prepare(
    "SELECT 1 AS ok FROM tenant_api_keys WHERE tenant_slug = ?1 AND key_hash = ?2 AND revoked_at IS NULL",
  )
    .bind(slug, hash)
    .first<{ ok: number }>();
  if (!match) throw new ApiError("unauthenticated", "Clé API invalide.");

  // Les 5 requêtes parallèles de la Function deviennent UNE requête à
  // sous-sélections — un aller-retour au lieu de cinq.
  const kpis = await env.DB.prepare(
    `SELECT
       (SELECT count(*) FROM documents WHERE collection='communities'    AND tenant_slug=?1) AS communities,
       (SELECT count(*) FROM documents WHERE collection='events'         AND tenant_slug=?1) AS events,
       (SELECT count(*) FROM documents WHERE collection='formations'     AND tenant_slug=?1) AS formations,
       (SELECT count(*) FROM documents WHERE collection='equipmentNeeds' AND tenant_slug=?1) AS needs,
       (SELECT COALESCE(sum(json_extract(data,'$.membersCount')),0) FROM documents
          WHERE collection='communities' AND tenant_slug=?1) AS members,
       (SELECT COALESCE(sum(json_extract(data,'$.raisedAmount')),0) FROM documents
          WHERE collection='equipmentNeeds' AND tenant_slug=?1) AS raised,
       (SELECT COALESCE(sum(json_extract(data,'$.targetAmount')),0) FROM documents
          WHERE collection='equipmentNeeds' AND tenant_slug=?1) AS target,
       (SELECT COALESCE(sum(json_extract(data,'$.donorsCount')),0) FROM documents
          WHERE collection='equipmentNeeds' AND tenant_slug=?1) AS donors,
       (SELECT count(*) FROM memberships WHERE tenant_slug=?1) AS memberships,
       (SELECT COALESCE(sum(sent_count),0) FROM campaigns WHERE tenant_slug=?1) AS messagesSent`,
  )
    .bind(slug)
    .first<Record<string, number>>();

  await env.DB.prepare(
    "UPDATE tenant_api_keys SET last_used_at = ?1 WHERE tenant_slug = ?2 AND key_hash = ?3",
  )
    .bind(Date.now(), slug, hash)
    .run();

  return json(
    { tenant: slug, generatedAt: new Date().toISOString(), currency: "XOF", kpis },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}

/**
 * Compteurs de confiance de l'accueil.
 *
 * REMPLACE `getPlatformStats()`, qui faisait 5 `getCountFromServer` sur Firestore
 * et échouait en permanence.
 *
 * DEUX BUGS CORRIGÉS
 *
 * 1. Le compteur « membres » comptait TOUTE la collection `users`, alors que la
 *    règle est `allow read: if isOwner(uid) || isAdmin()`. Un visiteur anonyme
 *    ne peut pas compter cette collection : l'appel échouait en 403 et le
 *    compteur restait vide pour tout le monde, depuis l'origine.
 *
 * 2. Le compteur « établissements » interrogeait `organizations` avec
 *    `type == 'healthcare_facility'`. Or la consolidation vers `facilities` est
 *    terminée en production : `organizations` est VIDE. L'accueil annonçait donc
 *    zéro établissement alors qu'il y en a 192.
 *
 * Les quatre compteurs sont désormais servis par UNE requête, publiquement et
 * sans exposer de données individuelles — un agrégat n'est pas une lecture de
 * documents.
 */
import type { Env } from "../auth/context";
import { json } from "../lib/http";

export async function platformStats(env: Env): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT
       (SELECT count(*) FROM documents
         WHERE collection = 'facilities' AND published = 1 AND deleted_at IS NULL) AS facilities,
       (SELECT count(*) FROM users) AS members,
       (SELECT count(*) FROM documents
         WHERE collection = 'partners' AND published = 1 AND deleted_at IS NULL)
       + (SELECT count(*) FROM organizations
           WHERE status = 'active' AND type IN ('partner', 'partner_donor')) AS partners,
       (SELECT count(*) FROM documents
         WHERE collection = 'equipmentNeeds' AND published = 1 AND deleted_at IS NULL) AS equipmentNeeds`,
  ).first<{ facilities: number; members: number; partners: number; equipmentNeeds: number }>();

  return json(row ?? { facilities: 0, members: 0, partners: 0, equipmentNeeds: 0 }, {
    // Des compteurs de confiance n'ont pas besoin d'être à la seconde.
    headers: { "cache-control": "public, max-age=300, stale-while-revalidate=900" },
  });
}

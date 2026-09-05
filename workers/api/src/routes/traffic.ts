/**
 * Trafic d'un espace partenaire.
 *
 * REMPLACE `getTenantTraffic` ET SA DÉPENDANCE GA4.
 *
 * L'originale interrogeait l'API GA4 Data via `@google-analytics/data`, une
 * bibliothèque gRPC/Node qui ne peut PAS tourner sur Workers. Pire, elle
 * s'appuyait sur les identifiants par défaut du compte de service (ADC), qui
 * n'existent pas non plus sur Workers : il aurait fallu embarquer une clé de
 * compte de service Google dans le Worker et signer un JWT à chaque appel.
 *
 * Les données internes (`page_view_daily`, alimentée par le beacon) produisent
 * déjà les mêmes chiffres. Cette route supprime donc d'un coup : la dépendance
 * GA4, la clé Google dans le Worker, et le cron d'agrégation.
 *
 * `TenantTraffic` a tous ses champs optionnels côté client : `sessions` reste
 * absent, l'UI se dégrade sans changement de type.
 */
import type { Env } from "../auth/context";
import { ApiError, json } from "../lib/http";
import type { Ctx } from "../policy/types";

export async function tenantTraffic(env: Env, ctx: Ctx, slug: string): Promise<Response> {
  if (!ctx.actor) throw new ApiError("unauthenticated", "Authentification requise.");
  const isAdmin = ctx.actor.role === "admin" || ctx.actor.role === "super_admin";
  if (!isAdmin && !ctx.managedTenants.has(slug)) {
    throw new ApiError("permission-denied", "Espace partenaire non géré.");
  }

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const { results } = await env.DB.prepare(
    `SELECT day, sum(views) AS views FROM page_view_daily
      WHERE tenant_slug = ?1 AND day >= ?2
      GROUP BY day ORDER BY day`,
  )
    .bind(slug, since)
    .all<{ day: string; views: number }>();

  const rows = results ?? [];
  const total = rows.reduce((n, r) => n + r.views, 0);

  const top = await env.DB.prepare(
    `SELECT path, sum(views) AS views FROM page_view_daily
      WHERE tenant_slug = ?1 AND day >= ?2
      GROUP BY path ORDER BY views DESC LIMIT 10`,
  )
    .bind(slug, since)
    .all<{ path: string; views: number }>();

  return json({
    configured: true,
    source: "interne",
    views: total,
    daily: rows,
    topPaths: top.results ?? [],
  });
}

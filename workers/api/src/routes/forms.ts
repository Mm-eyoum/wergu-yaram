/**
 * Écritures anonymes — leads, adhésions, newsletter, intentions de soutien, vues.
 *
 * Ces cinq collections acceptaient déjà des écritures NON authentifiées côté
 * Firestore, protégées uniquement par App Check et des règles de forme
 * (`isText(x, 1, 120)`…). App Check disparaît avec Firestore : Turnstile prend
 * le relais, et les contraintes de forme sont désormais appliquées à deux
 * niveaux — ici, et par les CHECK des tables D1.
 */
import type { Env } from "../auth/context";
import { ApiError, json } from "../lib/http";
import { drainOutbox, outboxInsert } from "../lib/outbox";
import { assertHuman } from "../lib/turnstile";

interface Ctx0 {
  waitUntil(p: Promise<unknown>): void;
}

function str(body: Record<string, unknown>, key: string, min: number, max: number): string {
  const v = body[key];
  if (typeof v !== "string" || v.length < min || v.length > max) {
    throw new ApiError("invalid-argument", `Champ « ${key} » invalide.`);
  }
  return v;
}

function optStr(body: Record<string, unknown>, key: string, max: number): string | null {
  const v = body[key];
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || v.length > max) {
    throw new ApiError("invalid-argument", `Champ « ${key} » invalide.`);
  }
  return v;
}

async function readBody(request: Request, env: Env): Promise<Record<string, unknown>> {
  const body = (await request.json()) as Record<string, unknown>;
  await assertHuman(
    typeof body.turnstileToken === "string" ? body.turnstileToken : undefined,
    env.TURNSTILE_SECRET_KEY,
    request.headers.get("cf-connecting-ip"),
  );
  return body;
}

export async function submitLead(env: Env, request: Request): Promise<Response> {
  const body = await readBody(request, env);
  const kind = str(body, "kind", 1, 20);
  if (!["contact", "demo", "candidature"].includes(kind)) {
    throw new ApiError("invalid-argument", "Type de demande inconnu.");
  }
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO leads (id, tenant_slug, kind, name, email, phone, message, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
  )
    .bind(
      id,
      str(body, "tenantSlug", 1, 80),
      kind,
      str(body, "name", 1, 120),
      str(body, "email", 5, 200),
      optStr(body, "phone", 40),
      optStr(body, "message", 3000),
      Date.now(),
    )
    .run();
  return json({ id }, { status: 201 });
}

export async function submitMembership(env: Env, request: Request): Promise<Response> {
  const body = await readBody(request, env);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO memberships (id, tenant_slug, uid, name, email, phone, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(
      id,
      str(body, "tenantSlug", 1, 80),
      optStr(body, "uid", 128),
      str(body, "name", 1, 120),
      str(body, "email", 5, 200),
      optStr(body, "phone", 40),
      Date.now(),
    )
    .run();
  return json({ id }, { status: 201 });
}

/**
 * Inscription newsletter — remplace le trigger `onNewsletterSignup`.
 * L'écriture et son effet de bord partent dans le MÊME lot atomique.
 */
export async function submitNewsletter(env: Env, request: Request, ctx0: Ctx0): Promise<Response> {
  const body = await readBody(request, env);
  const email = str(body, "email", 5, 200);
  const source = optStr(body, "source", 60);
  const id = crypto.randomUUID();

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO newsletter_signups (id, email, source, created_at) VALUES (?1, ?2, ?3, ?4)",
    ).bind(id, email, source, Date.now()),
    outboxInsert(env, "newsletter.welcome", { email, source }),
  ]);

  // Livraison immédiate en meilleur effort ; l'outbox garantit le rattrapage.
  ctx0.waitUntil(drainOutbox(env));
  return json({ id }, { status: 201 });
}

/** Intention de soutien — remplace le trigger `onSupportIntent`. */
export async function submitSupportIntent(env: Env, request: Request, ctx0: Ctx0): Promise<Response> {
  const body = await readBody(request, env);
  const email = str(body, "email", 5, 200);
  const amount = body.monthlyAmount;
  if (typeof amount !== "number" || amount < 500 || amount > 5_000_000) {
    throw new ApiError("invalid-argument", "Montant mensuel invalide.");
  }
  const id = crypto.randomUUID();

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO support_intents (id, email, monthly_amount, created_at) VALUES (?1, ?2, ?3, ?4)",
    ).bind(id, email, amount, Date.now()),
    outboxInsert(env, "support.intent", { email, monthlyAmount: String(amount) }),
  ]);

  ctx0.waitUntil(drainOutbox(env));
  return json({ id }, { status: 201 });
}

/**
 * Vue de page d'un espace partenaire.
 *
 * Remplace la collection `pageViews`, qui stockait UN document par vue et devait
 * être vidangée chaque nuit (lire 350 / agréger / supprimer) — un contournement
 * des limites de lot Firestore, sans raison d'exister ici. Une ligne par
 * (tenant, jour, chemin), incrémentée à l'écriture : le cron disparaît.
 *
 * Pas de Turnstile : le volume est élevé et l'écriture sans PII ni portée.
 */
export async function recordPageView(env: Env, request: Request): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;
  const tenantSlug = str(body, "tenantSlug", 1, 80);
  const path = str(body, "path", 1, 300);
  const day = new Date().toISOString().slice(0, 10);

  await env.DB.prepare(
    `INSERT INTO page_view_daily (tenant_slug, day, path, views) VALUES (?1, ?2, ?3, 1)
     ON CONFLICT(tenant_slug, day, path) DO UPDATE SET views = views + 1`,
  )
    .bind(tenantSlug, day, path)
    .run();

  return new Response(null, { status: 204 });
}

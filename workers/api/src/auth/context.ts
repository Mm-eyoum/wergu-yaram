/**
 * Résolution de l'acteur : du jeton vérifié vers un profil autorisable.
 *
 * Le jeton Firebase ne porte QUE l'identité (uid, email). Les rôles vivent dans
 * la table `users` de D1 et sont relus à chaque requête — une lecture sur clé
 * primaire, submillisecondes.
 *
 * Ce n'est pas un compromis : si les rôles étaient des custom claims, suspendre
 * un compte n'aurait d'effet qu'au renouvellement du jeton, soit jusqu'à une
 * heure plus tard. Ici, c'est immédiat.
 */
import type { Actor, Ctx, Role, UserStatus } from "../policy/types";
import { bearerFrom, verifyFirebaseIdToken, TokenError } from "./verifyIdToken";

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  MEDIA: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  APP_PUBLIC_URL: string;
  R2_PUBLIC_BASE: string;
  CORS_ORIGINS: string;
  /** Filet de secours : uids toujours super_admin, même si la table `users` est fausse. */
  SUPER_ADMIN_UIDS?: string;

  // --- Intégrations (vars publiques) ---
  CHATWOOT_BASE_URL?: string;
  CHATWOOT_ACCOUNT_ID?: string;
  CHATWOOT_WEBSITE_INBOX_ID?: string;
  BREVO_SENDER?: string;
  BICTORYS_API_URL?: string;

  // --- Secrets (wrangler secret put) ---
  CHATWOOT_API_TOKEN?: string;
  CHATWOOT_HMAC_TOKEN?: string;
  CHATWOOT_WEBHOOK_TOKEN?: string;
  BREVO_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  BICTORYS_API_KEY?: string;
  BICTORYS_WEBHOOK_SECRET?: string;
  /** Poivre des empreintes de clés API impact. */
  IMPACT_KEY_PEPPER?: string;
  /** Signature des tickets WebSocket ; retombe sur IMPACT_KEY_PEPPER. */
  WS_TICKET_SECRET?: string;

  /** Messagerie temps réel — un objet par conversation. */
  CONVERSATION: DurableObjectNamespace<import("../do/ConversationDO").ConversationDO>;

  /** Diffusion des campagnes — jamais dans le cycle d'une requête. */
  TASKS?: Queue<import("../queue/consumer").CampaignTask>;
}

/** Contexte anonyme — le défaut, jamais une élévation implicite. */
export function anonymousCtx(): Ctx {
  return { actor: null, managedTenants: new Set() };
}

/**
 * Construit le contexte d'autorisation d'une requête.
 * Un jeton absent ou invalide ne lève pas : il donne un contexte anonyme, et ce
 * sont les politiques qui refusent. Les routes qui exigent une identité
 * appellent `requireUser`.
 */
export async function resolveCtx(request: Request, env: Env): Promise<Ctx> {
  const token = bearerFrom(request);
  if (!token) return anonymousCtx();

  let uid: string;
  try {
    ({ uid } = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID, env.CACHE));
  } catch (err) {
    if (err instanceof TokenError) return anonymousCtx();
    throw err; // panne JWKS : erreur serveur franche, pas une dégradation silencieuse
  }

  const row = await env.DB.prepare("SELECT uid, role, status FROM users WHERE uid = ?1")
    .bind(uid)
    .first<{ uid: string; role: Role; status: UserStatus }>();

  const breakGlass = (env.SUPER_ADMIN_UIDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const actor: Actor = row
    ? { uid: row.uid, role: row.role, status: row.status }
    : // Authentifié chez Firebase mais sans profil : identité connue, aucun droit.
      { uid, role: "patient_public", status: "pending" };

  if (breakGlass.includes(uid)) actor.role = "super_admin";

  return { actor, managedTenants: new Set() };
}

/**
 * Charge les espaces partenaires gérés par l'acteur.
 *
 * Appelée UNIQUEMENT par les routes qui en ont besoin : la résoudre
 * systématiquement coûterait une requête à chaque appel. Une route qui oublie
 * de l'appeler obtient un ensemble vide, donc un refus — l'échec est fermé.
 */
export async function loadManagedTenants(env: Env, ctx: Ctx): Promise<Ctx> {
  if (!ctx.actor) return ctx;
  const { results } = await env.DB.prepare(
    `SELECT id FROM documents
      WHERE collection = 'tenants'
        AND ( owner_uid = ?1
              OR EXISTS (SELECT 1 FROM json_each(json_extract(data, '$.managerUids'))
                         WHERE value = ?1) )`,
  )
    .bind(ctx.actor.uid)
    .all<{ id: string }>();
  return { ...ctx, managedTenants: new Set((results ?? []).map((r) => r.id)) };
}

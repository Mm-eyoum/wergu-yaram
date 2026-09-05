/**
 * Worker API — point d'entrée.
 *
 * État : lots 0 à 6. Vérification des jetons Firebase, rôles depuis D1, moteur
 * de politiques, lectures et écritures, R2, messagerie temps réel (Durable
 * Object), et les 9 fonctions serveur portées hors paiements.
 *
 * Les chemins /api/* historiques sont préservés au bit près : aucun tiers déjà
 * intégré (Chatwoot, bailleurs de l'API impact) n'a à changer quoi que ce soit.
 *
 * Firebase Auth reste le fournisseur d'identité (gratuit sur le plan Spark) :
 * ce Worker vérifie les jetons lui-même, faute d'Admin SDK sur Workers.
 */
import { loadManagedTenants, resolveCtx, type Env } from "./auth/context";
import { ApiError, corsHeaders, errorResponse, json } from "./lib/http";
import { usersPolicy } from "./policy/collections";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listCollection,
  updateDocument,
} from "./routes/collections";
import { exportCatalog, getSettings } from "./routes/catalog";
import { deleteMedia, uploadAvatar, uploadMedia } from "./routes/uploads";
import {
  recordPageView,
  submitLead,
  submitMembership,
  submitNewsletter,
  submitSupportIntent,
} from "./routes/forms";
import { drainOutbox } from "./lib/outbox";
import { chatwootIdentity } from "./routes/support";
import { bictorysWebhook } from "./webhooks/bictorys";
import {
  createDonationCharge,
  createPlanCharge,
  createTicketCharge,
} from "./routes/payments";
import { chatwootWebhook } from "./webhooks/chatwoot";
import { impactApi } from "./routes/impact";
import { sendCampaign } from "./routes/campaigns";
import { tenantTraffic } from "./routes/traffic";
import { aggregateRevenue } from "./cron/aggregateRevenue";
import { remindDueSubscriptions } from "./cron/remindDueSubscriptions";
import { handleQueue, type CampaignTask } from "./queue/consumer";
import {
  ensureSupportConversation,
  issueWsTicket,
  listConversationReads,
  listConversations,
  listMessages,
  markConversationRead,
  openSocket,
  postMessage,
} from "./routes/conversations";

// Les classes de Durable Object doivent être exportées depuis le point d'entrée.
export { ConversationDO } from "./do/ConversationDO";
import type { Ctx } from "./policy/types";

function requireUser(ctx: Ctx): NonNullable<Ctx["actor"]> {
  if (!ctx.actor) throw new ApiError("unauthenticated", "Authentification requise.");
  if (ctx.actor.status === "suspended") {
    throw new ApiError("permission-denied", "Compte suspendu.");
  }
  return ctx.actor;
}

/** Sonde de santé : prouve que les bindings répondent. Aucune donnée exposée. */
async function health(env: Env): Promise<Response> {
  const checks: Record<string, string> = {};
  try {
    await env.DB.prepare("SELECT 1").first();
    checks.d1 = "ok";
  } catch {
    checks.d1 = "ko";
  }
  try {
    await env.CACHE.get("__health__");
    checks.kv = "ok";
  } catch {
    checks.kv = "ko";
  }
  const healthy = Object.values(checks).every((v) => v === "ok");
  return json({ status: healthy ? "ok" : "degraded", stage: "lots 0-6", checks }, {
    status: healthy ? 200 : 503,
  });
}

/**
 * Profil de l'appelant. Remplace `fetchUserProfile()` (une lecture Firestore par
 * `onAuthStateChanged`) et devient la source de vérité du rôle côté client.
 */
async function me(env: Env, ctx: Ctx): Promise<Response> {
  const actor = requireUser(ctx);
  const row = await env.DB.prepare(
    `SELECT uid, email, display_name, photo_url, role, status, region, phone,
            language, interests, sms_consent, whatsapp_consent, created_at
       FROM users WHERE uid = ?1`,
  )
    .bind(actor.uid)
    .first<Record<string, unknown>>();

  if (!row) throw new ApiError("not-found", "Profil introuvable.");
  if (!usersPolicy.read || !usersPolicy.read(ctx, { uid: actor.uid }, null).allow) {
    throw new ApiError("permission-denied", "Lecture non autorisée.");
  }

  return json({
    uid: row.uid,
    email: row.email,
    displayName: row.display_name,
    photoURL: row.photo_url,
    role: row.role,
    status: row.status,
    region: row.region,
    phone: row.phone,
    language: row.language,
    interests: JSON.parse((row.interests as string) ?? "[]"),
    smsConsent: row.sms_consent === 1,
    whatsappConsent: row.whatsapp_consent === 1,
    createdAt: row.created_at,
  });
}

/** Espaces partenaires gérés par l'appelant — valide la résolution des tenants. */
async function myTenants(env: Env, ctx: Ctx): Promise<Response> {
  requireUser(ctx);
  const withTenants = await loadManagedTenants(env, ctx);
  return json({ tenants: [...withTenants.managedTenants] });
}

/** Rejoue une réponse en y ajoutant les en-têtes CORS. */
function withCors(res: Response, cors: Record<string, string>): Response {
  if (Object.keys(cors).length === 0) return res;
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** Résout la route ; lève une ApiError si aucune ne correspond. */
async function route(
  request: Request,
  env: Env,
  url: URL,
  ctx0: ExecutionContext,
): Promise<Response> {
  if (url.pathname === "/health") return health(env);

  const ctx = await resolveCtx(request, env);

  // Écritures anonymes — Turnstile remplace App Check (cf. routes/forms.ts).
  if (request.method === "POST" && url.pathname.startsWith("/api/v1/forms/")) {
    switch (url.pathname) {
      case "/api/v1/forms/lead":
        return submitLead(env, request);
      case "/api/v1/forms/membership":
        return submitMembership(env, request);
      case "/api/v1/forms/newsletter":
        return submitNewsletter(env, request, ctx0);
      case "/api/v1/forms/support-intent":
        return submitSupportIntent(env, request, ctx0);
      case "/api/v1/forms/pageview":
        return recordPageView(env, request);
    }
  }

  if (url.pathname === "/api/v1/settings") return getSettings(env);
  if (url.pathname === "/api/v1/export/catalog") return exportCatalog(env);
  // --- Fonctions serveur portées (ex-Cloud Functions) ----------------------
  // Les chemins /api/* sont préservés AU BIT PRÈS : aucun tiers déjà intégré
  // (Chatwoot, bailleurs) n'a à changer quoi que ce soit.
  if (url.pathname === "/api/chatwootWebhook" || url.pathname === "/api/webhooks/chatwoot") {
    return chatwootWebhook(env, request, url);
  }
  // Chemin identique à celui enregistré chez Bictorys : rien à re-déclarer chez eux.
  if (url.pathname === "/api/bictorysWebhook" || url.pathname === "/api/webhooks/bictorys") {
    return bictorysWebhook(env, request);
  }
  if (url.pathname === "/api/impact" || url.pathname === "/api/v1/impact") {
    return impactApi(env, request, url);
  }
  if (url.pathname === "/api/v1/support/identity") {
    return chatwootIdentity(env, await resolveCtx(request, env));
  }
  // --- Paiements (dormants tant que Bictorys n'est pas branché) ------------
  if (request.method === "POST" && url.pathname.startsWith("/api/v1/")) {
    if (url.pathname === "/api/v1/donations/charge") {
      return createDonationCharge(env, await resolveCtx(request, env), request);
    }
    if (url.pathname === "/api/v1/billing/plan-checkout") {
      return createPlanCharge(env, await resolveCtx(request, env), request);
    }
    if (url.pathname === "/api/v1/billing/ticket-checkout") {
      return createTicketCharge(env, await resolveCtx(request, env), request);
    }
  }

  if (url.pathname === "/api/v1/campaigns" && request.method === "POST") {
    return sendCampaign(env, await loadManagedTenants(env, await resolveCtx(request, env)), request,
      (p) => ctx0.waitUntil(p));
  }
  const traffic = /^\/api\/v1\/tenants\/([^/]+)\/traffic$/.exec(url.pathname);
  if (traffic) {
    return tenantTraffic(env, await loadManagedTenants(env, await resolveCtx(request, env)),
      decodeURIComponent(traffic[1]));
  }

  // --- Messagerie ---------------------------------------------------------
  if (url.pathname === "/api/v1/conversations") {
    if (request.method === "GET") return listConversations(env, ctx);
    if (request.method === "POST") return ensureSupportConversation(env, ctx);
  }
  const conv = /^\/api\/v1\/conversations\/([^/]+)\/(messages|ws-ticket|ws|read)$/.exec(url.pathname);
  if (conv) {
    const id = decodeURIComponent(conv[1]);
    switch (conv[2]) {
      case "messages":
        return request.method === "POST"
          ? postMessage(env, ctx, id, request)
          : listMessages(env, ctx, id, url);
      case "ws-ticket":
        return issueWsTicket(env, ctx, id);
      case "ws":
        return openSocket(env, id, url, request);
      case "read":
        return markConversationRead(env, ctx, id);
    }
  }
  if (url.pathname === "/api/v1/me/conversation-reads") return listConversationReads(env, ctx);

  if (url.pathname === "/api/v1/me") return me(env, ctx);
  if (url.pathname === "/api/v1/me/tenants") return myTenants(env, ctx);

  if (request.method === "POST" && url.pathname === "/api/v1/uploads/avatar") {
    return uploadAvatar(env, ctx, request);
  }
  if (request.method === "POST" && url.pathname === "/api/v1/uploads/media") {
    return uploadMedia(env, ctx, request);
  }
  const mediaDel = /^\/api\/v1\/media\/([^/]+)$/.exec(url.pathname);
  if (mediaDel && request.method === "DELETE") {
    return deleteMedia(env, ctx, decodeURIComponent(mediaDel[1]));
  }

  // Endpoint générique : préserve les couches client qui prennent un nom de
  // collection à l'EXÉCUTION (catalog.ts, contentAdmin.ts, tenantAnalytics.ts).
  const coll = /^\/api\/v1\/collections\/([A-Za-z]+)(?:\/([^/]+))?$/.exec(url.pathname);
  if (coll) {
    const [, name, rawId] = coll;
    const id = rawId ? decodeURIComponent(rawId) : null;
    switch (request.method) {
      case "GET":
        return id ? getDocument(env, ctx, name, id) : listCollection(env, ctx, name, url);
      case "POST":
        // addDoc : le serveur attribue l'identifiant.
        if (id) throw new ApiError("invalid-argument", "POST ne prend pas d'identifiant.");
        return createDocument(env, ctx, name, request);
      case "PUT":
        // setDoc : remplacement complet (et création si absent).
        if (!id) throw new ApiError("invalid-argument", "PUT exige un identifiant.");
        return updateDocument(env, ctx, name, id, request, "replace");
      case "PATCH":
        // updateDoc : fusion. La politique voit le document RÉSULTANT.
        if (!id) throw new ApiError("invalid-argument", "PATCH exige un identifiant.");
        return updateDocument(env, ctx, name, id, request, "merge");
      case "DELETE":
        if (!id) throw new ApiError("invalid-argument", "DELETE exige un identifiant.");
        return deleteDocument(env, ctx, name, id);
      default:
        throw new ApiError("invalid-argument", `Méthode ${request.method} non supportée.`);
    }
  }

  // Refus par défaut — l'équivalent de `match /{document=**} { allow: if false }`
  // dans firestore.rules : une route non déclarée n'existe pas.
  throw new ApiError("not-found", "Route inconnue.");
}

export default {
  async fetch(request: Request, env: Env, ctx0: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env.CORS_ORIGINS);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      return withCors(await route(request, env, url, ctx0), cors);
    } catch (err) {
      return withCors(errorResponse(err), cors);
    }
  },
  /**
   * Cron quotidien — filet de rattrapage de l'outbox.
   *
   * La livraison normale se fait en `waitUntil` juste après l'écriture ; ce
   * balayage ne traite que ce qui n'est pas parti (isolat tué, service tiers
   * indisponible). Sans lui, un email de bienvenue perdu le reste pour toujours.
   */
  async scheduled(event: ScheduledController, env: Env, ctx0: ExecutionContext): Promise<void> {
    ctx0.waitUntil(
      (async () => {
        // Le rattrapage de l'outbox tourne à chaque déclenchement : c'est le
        // filet qui empêche un email de bienvenue d'être perdu définitivement.
        const rattrapes = await drainOutbox(env, 50);
        if (rattrapes > 0) console.info(`outbox : ${rattrapes} effet(s) rattrapé(s)`);

        switch (event.cron) {
          case "0 2 * * *": {
            const n = await aggregateRevenue(env);
            console.info(`agrégat de revenus : ${n} ligne(s)`);
            break;
          }
          case "0 9 * * *": {
            const r = await remindDueSubscriptions(env);
            console.info(`abonnements : ${r.expired} échu(s), ${r.reminded} relancé(s)`);
            break;
          }
        }
      })(),
    );
  },

  /** Diffusion des campagnes — hors du cycle de la requête. */
  async queue(batch: MessageBatch<CampaignTask>, env: Env): Promise<void> {
    await handleQueue(batch, env);
  },
} satisfies ExportedHandler<Env, CampaignTask>;

/**
 * Identité vérifiée du widget Chatwoot.
 *
 * Portage direct de la Callable `chatwootIdentity` : HMAC-SHA256 de l'uid avec
 * un secret partagé. Sans elle, le visiteur est identifié en session NON
 * vérifiée — ce qui laisse l'usurpation d'identité possible dans le widget.
 *
 * Aucune dépendance base : c'est le portage le plus simple des 13, et c'est
 * pourquoi il a servi de canari en production.
 */
import type { Env } from "../auth/context";
import { ApiError, json } from "../lib/http";
import type { Ctx } from "../policy/types";

export async function chatwootIdentity(env: Env, ctx: Ctx): Promise<Response> {
  if (!ctx.actor) throw new ApiError("unauthenticated", "Authentification requise.");
  if (!env.CHATWOOT_HMAC_TOKEN) return json({});

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.CHATWOOT_HMAC_TOKEN),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ctx.actor.uid));
  const identifierHash = [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return json({ identifierHash });
}

/**
 * Réponses HTTP et correspondance des erreurs.
 *
 * Les callables Firebase renvoyaient des codes `HttpsError`. Les appelants
 * n'inspectent jamais `err.code` (vérifié dans tout src/), sauf le message de
 * quota de campagne, affiché tel quel dans l'UI partenaire — d'où la
 * conservation du message dans le corps.
 */
export const ERROR_STATUS = {
  "invalid-argument": 400,
  unauthenticated: 401,
  "permission-denied": 403,
  "not-found": 404,
  "failed-precondition": 409,
  "resource-exhausted": 429,
  internal: 500,
  unavailable: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return json({ error: err.message, code: err.code }, { status: ERROR_STATUS[err.code] });
  }
  // Aucun détail interne vers le client ; le contexte part dans les logs Workers.
  console.error("erreur non gérée", err);
  return json({ error: "Erreur interne.", code: "internal" }, { status: 500 });
}

/**
 * CORS.
 *
 * En production, l'API sera servie en MÊME ORIGINE que le site (`/api/*` via un
 * service binding depuis le Worker qui sert les assets) : à 200 ms de latence
 * depuis Dakar, supprimer le préflight vaut mieux que la plupart des
 * optimisations de requête. Ces en-têtes n'existent que pour la phase de
 * validation, où le site tourne en local ou en préprod face à l'API déployée.
 */
export function corsHeaders(request: Request, allowed: string): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin) return {};
  const list = allowed.split(",").map((s) => s.trim()).filter(Boolean);
  const ok =
    list.includes(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.werguyaram\.org$/.test(origin);
  if (!ok) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

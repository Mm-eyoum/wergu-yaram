/**
 * Vérification des jetons d'identité Firebase, dans le Worker.
 *
 * Remplace `getAuth().verifyIdToken()` (firebase-admin), qui est du Node et ne
 * peut pas tourner sur Workers. Firebase Auth reste le fournisseur d'identité —
 * il est gratuit sur le plan Spark — mais c'est désormais nous qui validons.
 *
 * Les RÔLES ne viennent PAS du jeton : le projet n'utilise aucun custom claim,
 * ils vivent dans la table `users` de D1 (cf. resolveActor). C'est un choix, pas
 * une contrainte : poser un claim exige l'Admin SDK, et sa propagation attend le
 * rafraîchissement du jeton (jusqu'à 1 h) — une suspension mettrait donc une
 * heure à prendre effet. En lisant D1 à chaque requête, elle est immédiate.
 */
import { getVerificationKey } from "./jwks";

export interface VerifiedToken {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export class TokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenError";
  }
}

/** Tolérance d'horloge entre Google et le edge Cloudflare. */
const SKEW_S = 60;

function b64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToJson<T>(input: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(input))) as T;
}

interface JwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}
interface JwtPayload {
  iss?: string;
  aud?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  auth_time?: number;
  email?: string;
  email_verified?: boolean;
}

export async function verifyFirebaseIdToken(
  token: string,
  projectId: string,
  kv: KVNamespace,
  now: number = Math.floor(Date.now() / 1000),
): Promise<VerifiedToken> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new TokenError("jeton malformé");
  const [rawHeader, rawPayload, rawSignature] = parts;

  let header: JwtHeader;
  let payload: JwtPayload;
  try {
    header = b64urlToJson<JwtHeader>(rawHeader);
    payload = b64urlToJson<JwtPayload>(rawPayload);
  } catch {
    throw new TokenError("jeton illisible");
  }

  // ⚠️ On EXIGE RS256 et on code l'algorithme en dur plus bas. Sélectionner
  // l'algorithme d'après le jeton est la faille classique des implémentations
  // JWT maison (confusion d'algorithme, `alg: none`).
  if (header.alg !== "RS256") throw new TokenError("algorithme de signature non supporté");
  if (typeof header.kid !== "string" || header.kid.length === 0) {
    throw new TokenError("jeton sans identifiant de clé (kid)");
  }

  const key = await getVerificationKey(kv, header.kid);
  const signed = new TextEncoder().encode(`${rawHeader}.${rawPayload}`);
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(rawSignature),
    signed,
  );
  if (!ok) throw new TokenError("signature invalide");

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new TokenError("émetteur inattendu");
  }
  if (payload.aud !== projectId) throw new TokenError("audience inattendue");
  if (typeof payload.exp !== "number" || payload.exp <= now - SKEW_S) {
    throw new TokenError("jeton expiré");
  }
  if (typeof payload.iat !== "number" || payload.iat > now + SKEW_S) {
    throw new TokenError("jeton émis dans le futur");
  }
  if (typeof payload.auth_time === "number" && payload.auth_time > now + SKEW_S) {
    throw new TokenError("authentification datée du futur");
  }
  if (typeof payload.sub !== "string" || payload.sub.length === 0 || payload.sub.length > 128) {
    throw new TokenError("sujet (uid) invalide");
  }

  return {
    uid: payload.sub,
    email: payload.email ?? null,
    emailVerified: payload.email_verified === true,
  };
}

/** Extrait le porteur d'un en-tête `Authorization`. `null` si absent. */
export function bearerFrom(request: Request): string | null {
  const raw = request.headers.get("authorization");
  if (!raw) return null;
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return m ? m[1] : null;
}

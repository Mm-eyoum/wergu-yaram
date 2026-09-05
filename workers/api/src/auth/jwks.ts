/**
 * Cache des clés publiques Google servant à vérifier les jetons Firebase.
 *
 * ⚠️ On utilise le point d'accès **JWK**, pas le x509 :
 *   https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
 * Le point d'accès x509 renvoie des CERTIFICATS PEM, que WebCrypto ne sait pas
 * importer — il faudrait parser l'ASN.1 pour en extraire le SPKI. Le JWK est
 * directement consommable par `crypto.subtle.importKey('jwk', …)`.
 *
 * Trois niveaux de cache, du plus chaud au plus froid :
 *   1. mémo au niveau du module (durée de vie de l'isolat) — la plupart des
 *      requêtes ne font AUCUNE I/O ;
 *   2. KV, avec le TTL lu dans le `Cache-Control` de Google (quelques heures) ;
 *   3. réseau.
 *
 * Ce module est le point de défaillance unique de toute l'API authentifiée :
 * si Google est injoignable, on sert délibérément la copie KV PÉRIMÉE plutôt que
 * de renvoyer 500 à chaque requête.
 */

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const KV_KEY = "jwks:securetoken";
/** Au-delà, on refuse de servir du périmé : mieux vaut échouer que valider à tort. */
const STALE_MAX_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TTL_S = 3600;

interface Jwk {
  kid: string;
  kty: string;
  alg: string;
  use?: string;
  n: string;
  e: string;
}
interface JwksPayload {
  keys: Jwk[];
  fetchedAt: number;
}

/** Mémo d'isolat : clés déjà importées, indexées par `kid`. */
let memo: { payload: JwksPayload; imported: Map<string, CryptoKey> } | null = null;

function ttlFromCacheControl(res: Response): number {
  const cc = res.headers.get("cache-control") ?? "";
  const m = /max-age=(\d+)/i.exec(cc);
  const ttl = m ? Number(m[1]) : DEFAULT_TTL_S;
  // KV impose un minimum de 60 s ; on borne aussi le haut pour forcer la rotation.
  return Math.min(Math.max(ttl, 60), 24 * 3600);
}

async function fetchJwks(kv: KVNamespace): Promise<JwksPayload> {
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`JWKS indisponible : HTTP ${res.status}`);
  const body = (await res.json()) as { keys?: Jwk[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("JWKS vide ou malformé");
  }
  const payload: JwksPayload = { keys: body.keys, fetchedAt: Date.now() };
  await kv.put(KV_KEY, JSON.stringify(payload), { expirationTtl: ttlFromCacheControl(res) });
  return payload;
}

async function loadJwks(kv: KVNamespace, forceRefresh: boolean): Promise<JwksPayload> {
  if (!forceRefresh && memo) return memo.payload;

  if (!forceRefresh) {
    const cached = await kv.get<JwksPayload>(KV_KEY, "json");
    if (cached?.keys?.length) {
      memo = { payload: cached, imported: new Map() };
      return cached;
    }
  }

  try {
    const fresh = await fetchJwks(kv);
    memo = { payload: fresh, imported: new Map() };
    return fresh;
  } catch (err) {
    // Dégradation délibérée : servir du périmé récent plutôt que de rendre
    // TOUTE l'API authentifiée indisponible parce que Google a hoqueté.
    const stale = memo?.payload ?? (await kv.get<JwksPayload>(KV_KEY, "json"));
    if (stale?.keys?.length && Date.now() - stale.fetchedAt < STALE_MAX_MS) {
      return stale;
    }
    throw err;
  }
}

async function importKey(jwk: Jwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

/**
 * Clé publique correspondant au `kid`.
 *
 * Si le `kid` est absent du jeu en cache, on force EXACTEMENT un rechargement :
 * c'est le chemin de rotation des clés Google (environ quotidienne). L'omettre
 * produit une salve mystérieuse de 401 une fois par jour.
 */
export async function getVerificationKey(kv: KVNamespace, kid: string): Promise<CryptoKey> {
  for (const forceRefresh of [false, true]) {
    const payload = await loadJwks(kv, forceRefresh);
    if (memo && !forceRefresh) {
      const already = memo.imported.get(kid);
      if (already) return already;
    }
    const jwk = payload.keys.find((k) => k.kid === kid);
    if (jwk) {
      const key = await importKey(jwk);
      memo?.imported.set(kid, key);
      return key;
    }
  }
  throw new Error(`clé de signature inconnue (kid ${kid})`);
}

/** Réservé aux tests : vide le mémo d'isolat. */
export function __resetJwksMemo(): void {
  memo = null;
}

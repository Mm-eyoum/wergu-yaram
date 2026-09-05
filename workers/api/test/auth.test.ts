/**
 * Vérification des jetons Firebase — testée de bout en bout.
 *
 * On ne stube PAS verifyFirebaseIdToken : on génère une vraie paire RSA, on
 * signe de vrais jetons et on stube uniquement le point d'accès JWKS de Google.
 * Stuber la vérification laisserait non testé le code le plus sensible de l'API.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetJwksMemo } from "../src/auth/jwks";
import { TokenError, verifyFirebaseIdToken } from "../src/auth/verifyIdToken";

const PROJECT = "werguyaram";
const NOW = 1_800_000_000; // instant fixe, pour des tests déterministes

// --- KV en mémoire, suffisant pour ce que le module utilise ---
function makeKv() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string, type?: string) {
      const v = store.get(key);
      if (v === undefined) return null;
      return type === "json" ? JSON.parse(v) : v;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const byte of b) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makeKeyPair(): Promise<CryptoKeyPair> {
  // generateKey est typé `CryptoKey | CryptoKeyPair` (il couvre aussi les clés
  // symétriques) ; RSASSA-PKCS1-v1_5 renvoie toujours une paire.
  return (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
}

async function jwkOf(pair: CryptoKeyPair, kid: string) {
  const jwk = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as unknown as Record<
    string,
    unknown
  >;
  return { kid, kty: jwk.kty, alg: "RS256", use: "sig", n: jwk.n, e: jwk.e };
}

async function sign(
  pair: CryptoKeyPair,
  kid: string,
  payload: Record<string, unknown>,
  alg = "RS256",
): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg, kid, typ: "JWT" })));
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    pair.privateKey,
    new TextEncoder().encode(`${header}.${body}`),
  );
  return `${header}.${body}.${b64url(sig)}`;
}

function validPayload(over: Record<string, unknown> = {}) {
  return {
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    sub: "uid-123",
    iat: NOW - 60,
    exp: NOW + 3600,
    auth_time: NOW - 120,
    email: "awa@example.org",
    email_verified: true,
    ...over,
  };
}

let pair: CryptoKeyPair;
let kv: KVNamespace;
let fetchCalls = 0;
const realFetch = globalThis.fetch;

function stubJwks(keys: unknown[]) {
  globalThis.fetch = (async () => {
    fetchCalls++;
    return new Response(JSON.stringify({ keys }), {
      status: 200,
      headers: { "cache-control": "public, max-age=3600" },
    });
  }) as typeof fetch;
}

beforeEach(async () => {
  __resetJwksMemo();
  kv = makeKv();
  fetchCalls = 0;
  pair = await makeKeyPair();
  stubJwks([await jwkOf(pair, "k1")]);
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("vérification du jeton Firebase", () => {
  it("accepte un jeton valide et en extrait l'identité", async () => {
    const token = await sign(pair, "k1", validPayload());
    const res = await verifyFirebaseIdToken(token, PROJECT, kv, NOW);
    expect(res).toEqual({ uid: "uid-123", email: "awa@example.org", emailVerified: true });
  });

  it("refuse un jeton expiré", async () => {
    const token = await sign(pair, "k1", validPayload({ exp: NOW - 3600 }));
    await expect(verifyFirebaseIdToken(token, PROJECT, kv, NOW)).rejects.toThrow(TokenError);
  });

  it("refuse une audience étrangère (jeton d'un autre projet Firebase)", async () => {
    const token = await sign(pair, "k1", validPayload({ aud: "autre-projet" }));
    await expect(verifyFirebaseIdToken(token, PROJECT, kv, NOW)).rejects.toThrow(/audience/);
  });

  it("refuse un émetteur inattendu", async () => {
    const token = await sign(pair, "k1", validPayload({ iss: "https://evil.example" }));
    await expect(verifyFirebaseIdToken(token, PROJECT, kv, NOW)).rejects.toThrow(/émetteur/);
  });

  it("refuse une signature produite par une autre clé", async () => {
    const attacker = await makeKeyPair();
    const token = await sign(attacker, "k1", validPayload());
    await expect(verifyFirebaseIdToken(token, PROJECT, kv, NOW)).rejects.toThrow(/signature/);
  });

  it("refuse un algorithme autre que RS256 (confusion d'algorithme)", async () => {
    const token = await sign(pair, "k1", validPayload(), "none");
    await expect(verifyFirebaseIdToken(token, PROJECT, kv, NOW)).rejects.toThrow(/algorithme/);
  });

  it("refuse un jeton sans kid", async () => {
    const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
    const body = b64url(new TextEncoder().encode(JSON.stringify(validPayload())));
    await expect(verifyFirebaseIdToken(`${header}.${body}.x`, PROJECT, kv, NOW)).rejects.toThrow(/kid/);
  });

  it("refuse un jeton malformé", async () => {
    await expect(verifyFirebaseIdToken("pas-un-jwt", PROJECT, kv, NOW)).rejects.toThrow(TokenError);
  });

  it("ne refait pas d'appel réseau une fois les clés en cache", async () => {
    const token = await sign(pair, "k1", validPayload());
    await verifyFirebaseIdToken(token, PROJECT, kv, NOW);
    const after = fetchCalls;
    await verifyFirebaseIdToken(token, PROJECT, kv, NOW);
    expect(fetchCalls).toBe(after);
  });

  it("recharge le jeu de clés quand Google a fait tourner ses kid", async () => {
    // Une première vérification met « k1 » en cache.
    await verifyFirebaseIdToken(await sign(pair, "k1", validPayload()), PROJECT, kv, NOW);

    // Google publie « k2 » : sans rechargement forcé, ce serait une salve
    // quotidienne de 401 inexplicables.
    const rotated = await makeKeyPair();
    stubJwks([await jwkOf(rotated, "k2")]);
    const token = await sign(rotated, "k2", validPayload({ sub: "uid-rot" }));
    const res = await verifyFirebaseIdToken(token, PROJECT, kv, NOW);
    expect(res.uid).toBe("uid-rot");
  });

  it("échoue proprement si le kid reste introuvable après rechargement", async () => {
    const other = await makeKeyPair();
    const token = await sign(other, "kid-absent-du-jeu", validPayload());
    await expect(verifyFirebaseIdToken(token, PROJECT, kv, NOW)).rejects.toThrow(
      /clé de signature inconnue/,
    );
    // Un seul rechargement forcé, pas une boucle : deux appels au total.
    expect(fetchCalls).toBe(2);
  });
});

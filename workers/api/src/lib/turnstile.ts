/**
 * Cloudflare Turnstile — remplaçant d'App Check.
 *
 * App Check (reCAPTCHA v3) protégeait les écritures anonymes vers Firestore. Il
 * disparaît avec Firestore, et cinq endpoints acceptent des écritures sans
 * authentification (leads, adhésions, newsletter, intentions de soutien, vues).
 * Sans remplacement dans la MÊME livraison, la migration rendrait l'abus plus
 * facile qu'avant — d'où ce contrôle, posé en même temps que les endpoints.
 */
import { ApiError } from "./http";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function assertHuman(
  token: string | undefined,
  secret: string | undefined,
  ip: string | null,
): Promise<void> {
  // Non configuré ⇒ contrôle inactif. Délibéré : il ne doit pas bloquer la
  // plateforme avant que la clé ne soit posée, mais l'absence est journalisée.
  if (!secret) {
    console.warn("Turnstile non configuré : écriture anonyme acceptée sans vérification");
    return;
  }
  if (!token) throw new ApiError("permission-denied", "Vérification anti-robot manquante.");

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const res = await fetch(VERIFY_URL, { method: "POST", body: form });
  const body = (await res.json()) as { success?: boolean };
  if (!body.success) throw new ApiError("permission-denied", "Vérification anti-robot échouée.");
}

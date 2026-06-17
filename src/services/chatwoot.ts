/**
 * Chatwoot — canal de support omnicanal (agent ↔ utilisateur).
 *
 * Chatwoot centralise côté agents : web (ce widget), WhatsApp, email entrant et
 * réseaux sociaux. La messagerie pair-à-pair patient↔structure reste, elle, sur
 * Firestore (conversations/*). On intègre ici le widget « Parler à l'équipe ».
 *
 * Le `websiteToken` est public (sûr côté client). L'identité VÉRIFIÉE
 * (`identifier_hash`) est calculée côté serveur (Function `chatwootIdentity`,
 * secret HMAC) : on la récupère puis on la passe à `setUser`, ce qui empêche
 * l'usurpation d'identité dans le widget. Sans elle, l'utilisateur est identifié
 * en session non vérifiée (dégradation propre).
 */
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const baseUrl = import.meta.env.VITE_CHATWOOT_BASE_URL as string | undefined;
const websiteToken = import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN as string | undefined;

export const isChatwootConfigured = Boolean(baseUrl && websiteToken);

interface ChatwootSDK {
  run: (opts: { websiteToken: string; baseUrl: string }) => void;
}
interface ChatwootApi {
  toggle: (state?: "open" | "close") => void;
  setUser: (identifier: string, attributes: Record<string, unknown>) => void;
  setCustomAttributes: (attrs: Record<string, unknown>) => void;
  setLocale: (locale: string) => void;
  reset: () => void;
}
declare global {
  interface Window {
    chatwootSDK?: ChatwootSDK;
    $chatwoot?: ChatwootApi;
    chatwootSettings?: Record<string, unknown>;
  }
}

/** Signed-in user shape used to identify the visitor in Chatwoot. */
export interface ChatwootIdentity {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  role?: string | null;
  region?: string | null;
}

let loadPromise: Promise<void> | null = null;

/** Inject the Chatwoot SDK once and resolve when the widget is ready. */
export function loadChatwoot(): Promise<void> {
  if (!isChatwootConfigured) return Promise.reject(new Error("Chatwoot non configuré."));
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // `hideMessageBubble: false` → bulle flottante visible globalement (montée
    // par SupportLauncher). `locale: "fr"` aligne l'UI du widget sur le site.
    window.chatwootSettings = { hideMessageBubble: false, position: "right", locale: "fr", type: "expanded_bubble" };

    const ready = () => resolve();
    window.addEventListener("chatwoot:ready", ready, { once: true });

    const script = document.createElement("script");
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;
    script.onload = () => window.chatwootSDK?.run({ websiteToken: websiteToken!, baseUrl: baseUrl! });
    script.onerror = () => reject(new Error("Échec du chargement de Chatwoot."));
    document.head.appendChild(script);
  });
  return loadPromise;
}

/** Open the chat panel, loading the SDK on first use. */
export async function openChatwoot(): Promise<void> {
  await loadChatwoot();
  window.$chatwoot?.toggle("open");
}

/**
 * Fetch the server-computed `identifier_hash` for the signed-in user.
 * Returns undefined when Firebase/the function are unavailable (the widget then
 * runs an unverified session).
 */
export async function fetchChatwootIdentity(): Promise<string | undefined> {
  if (!functions) return undefined;
  try {
    const callable = httpsCallable<unknown, { identifierHash?: string }>(functions, "chatwootIdentity");
    const { data } = await callable({});
    return data?.identifierHash;
  } catch {
    return undefined;
  }
}

/** Identify the signed-in user in Chatwoot (call after ready). */
export function identifyChatwootUser(user: ChatwootIdentity, identifierHash?: string): void {
  window.$chatwoot?.setUser(user.uid, {
    name: user.displayName ?? undefined,
    email: user.email ?? undefined,
    // identité vérifiée : présente uniquement si le serveur a fourni le hash.
    ...(identifierHash ? { identifier_hash: identifierHash } : {}),
  });
  // Contexte utile aux agents (rôle, région) — affiché dans la fiche conversation.
  window.$chatwoot?.setCustomAttributes({
    role: user.role ?? undefined,
    region: user.region ?? undefined,
  });
}

/** Clear the Chatwoot session on logout. */
export function resetChatwoot(): void {
  window.$chatwoot?.reset();
}

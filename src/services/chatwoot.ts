/**
 * Chatwoot — canal de support (agent ↔ utilisateur).
 *
 * Chatwoot est conçu pour le support client, pas pour la messagerie pair-à-pair.
 * On l'intègre donc comme widget "Parler à l'équipe / support". La messagerie
 * patient ↔ structure reste, elle, sur Firestore (conversations/*).
 *
 * Le `websiteToken` est public (sûr côté client). L'identité vérifiée (HMAC
 * `identifier_hash`) nécessite un secret serveur : à fournir plus tard via une
 * Function, sinon on identifie l'utilisateur sans hash (sessions non vérifiées).
 */

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
  reset: () => void;
}
declare global {
  interface Window {
    chatwootSDK?: ChatwootSDK;
    $chatwoot?: ChatwootApi;
    chatwootSettings?: Record<string, unknown>;
  }
}

let loadPromise: Promise<void> | null = null;

/** Inject the Chatwoot SDK once and resolve when the widget is ready. */
export function loadChatwoot(): Promise<void> {
  if (!isChatwootConfigured) return Promise.reject(new Error("Chatwoot non configuré."));
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    window.chatwootSettings = { hideMessageBubble: true, position: "right", type: "expanded_bubble" };

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

/** Identify the signed-in user in Chatwoot (call after ready). */
export function identifyChatwootUser(user: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}): void {
  window.$chatwoot?.setUser(user.uid, {
    name: user.displayName ?? undefined,
    email: user.email ?? undefined,
  });
}

/** Clear the Chatwoot session on logout. */
export function resetChatwoot(): void {
  window.$chatwoot?.reset();
}

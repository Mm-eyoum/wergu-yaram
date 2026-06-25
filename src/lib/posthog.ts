/**
 * PostHog — analytics produit (tier gratuit), no-op si VITE_POSTHOG_KEY absent.
 *
 * Le SDK est chargé en import dynamique : il ne pèse sur le bundle QUE si une clé
 * est configurée. Complète GA4 : `src/lib/analytics.ts#track` fait suivre ses
 * events ici, et les pageviews SPA sont émis manuellement (App.tsx).
 */
const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://eu.i.posthog.com";

/** True quand une clé PostHog est configurée. */
export const isPosthogEnabled = Boolean(key);

let posthog: typeof import("posthog-js").default | null = null;
let started = false;

/** Initialise PostHog (chargement dynamique). No-op si clé absente ou hors navigateur. */
export async function initPosthog(): Promise<void> {
  if (started || !isPosthogEnabled || typeof window === "undefined") return;
  started = true;
  const mod = await import("posthog-js");
  posthog = mod.default;
  posthog.init(key!, {
    api_host: host,
    // On gère les pageviews nous-mêmes (SPA, voir App.tsx). Autocapture conservé.
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage",
  });
}

type Props = Record<string, string | number | boolean | undefined>;

/** Émet un event PostHog. No-op tant que non chargé / non configuré. */
export function captureEvent(name: string, props?: Props): void {
  if (!posthog) return;
  try {
    posthog.capture(name, props);
  } catch {
    /* l'instrumentation ne doit jamais casser l'app */
  }
}

/** Émet un pageview SPA pour le chemin courant. */
export function capturePageview(path: string): void {
  if (!posthog) return;
  try {
    posthog.capture("$pageview", { $current_url: window.location.origin + path });
  } catch {
    /* no-op */
  }
}

/** Associe les events à un utilisateur identifié (login). */
export function identifyUser(uid: string, props?: Props): void {
  if (!posthog) return;
  try {
    posthog.identify(uid, props);
  } catch {
    /* no-op */
  }
}

/** Réinitialise l'identité (logout). */
export function resetUser(): void {
  if (!posthog) return;
  try {
    posthog.reset();
  } catch {
    /* no-op */
  }
}

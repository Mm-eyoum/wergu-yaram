import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchChatwootIdentity,
  identifyChatwootUser,
  isChatwootConfigured,
  loadChatwoot,
  resetChatwoot,
} from "@/services/chatwoot";

/**
 * Charge le widget Chatwoot globalement (bulle flottante) sur les pages
 * publiques et identifie l'utilisateur connecté avec son identité vérifiée
 * (HMAC). No-op si Chatwoot n'est pas configuré — le CTA support retombe alors
 * sur la messagerie in-app (/messages). Ne rend aucun DOM (le SDK gère la bulle).
 */
export function SupportLauncher() {
  const { user } = useAuth();

  useEffect(() => {
    if (!isChatwootConfigured) return;
    let cancelled = false;

    loadChatwoot()
      .then(async () => {
        if (cancelled) return;
        if (user) {
          const hash = await fetchChatwootIdentity();
          if (!cancelled) identifyChatwootUser(user, hash);
        } else {
          resetChatwoot();
        }
      })
      .catch(() => {
        /* widget indisponible : on ignore, le fallback /messages reste accessible */
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return null;
}

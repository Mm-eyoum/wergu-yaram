import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { identifyChatwootUser, isChatwootConfigured, openChatwoot } from "@/services/chatwoot";

/**
 * Opens the support channel: the Chatwoot widget when configured (identifying
 * the signed-in user), otherwise falls back to the in-app /messages page.
 */
export function useSupport() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return useCallback(async () => {
    if (!isChatwootConfigured) {
      navigate("/messages");
      return;
    }
    try {
      await openChatwoot();
      if (user) identifyChatwootUser(user);
    } catch {
      navigate("/messages");
    }
  }, [navigate, user]);
}

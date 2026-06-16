import { useContext } from "react";
import { ToastContext, type ToastContextValue } from "@/context/toast";

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans un ToastProvider.");
  return ctx;
}

const COMING_SOON_DEFAULT =
  "Bientôt disponible — cette fonctionnalité arrive très prochainement.";

/**
 * Honest-affordance helper: returns a handler that surfaces a "coming soon"
 * notification instead of letting a CTA look clickable while doing nothing.
 */
export function useComingSoon() {
  const { notify } = useToast();
  return (message: string = COMING_SOON_DEFAULT) => notify(message, "info");
}

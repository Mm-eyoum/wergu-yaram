/**
 * Paiement des dons (Bictorys) — côté client.
 *
 * Le client n'appelle jamais Bictorys directement : il invoque la Cloud Function
 * `createBictorysCharge` (qui détient la clé secrète et fige le montant), reçoit
 * l'URL de checkout hébergé et y redirige l'utilisateur. Activé via
 * VITE_BICTORYS_ENABLED=true (sinon l'UI affiche « bientôt disponible »).
 */
import { httpsCallable } from "firebase/functions";
import { app, functions } from "./firebase";

export const isPaymentsEnabled = import.meta.env.VITE_BICTORYS_ENABLED === "true";

export type DonationPaymentType = "wave" | "orange_money" | "mtn_money" | "card";

interface ChargeInput {
  needId: string;
  amount: number;
  paymentType?: DonationPaymentType;
  /** Optional platform tip ("Soutenir aussi Wergu Yaram"), in XOF. */
  tipAmount?: number;
}

/**
 * Create a charge and redirect to Bictorys' hosted checkout.
 * Throws when payments are disabled or Firebase isn't configured — callers
 * should fall back to a "coming soon" message.
 */
export async function startDonation(input: ChargeInput): Promise<void> {
  if (!isPaymentsEnabled || !app || !functions) {
    throw new Error("Paiement non activé.");
  }
  const callable = httpsCallable<ChargeInput, { checkoutUrl: string; donationId: string }>(
    functions,
    "createBictorysCharge",
  );
  const { data } = await callable(input);
  if (!data?.checkoutUrl) throw new Error("URL de paiement indisponible.");
  window.location.href = data.checkoutUrl;
}

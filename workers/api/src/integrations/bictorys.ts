/**
 * Bictorys — checkout hébergé (Wave / Orange Money / MTN / carte, en XOF).
 *
 * ⚠️ Les commentaires de la Cloud Function d'origine signalent que plusieurs
 * détails de l'API ne sont PAS confirmés (nom du champ d'URL de checkout, schéma
 * de signature du webhook, valeurs de statut). Les accès défensifs multi-variantes
 * sont donc CONSERVÉS tels quels : les retirer serait un pari sur une doc non
 * vérifiée, alors qu'il s'agit d'argent.
 */
import { ApiError } from "../lib/http";

export type PaymentType = "wave" | "orange_money" | "mtn_money" | "card";

export const MIN_AMOUNT = 500;
export const MAX_AMOUNT = 5_000_000;
export const MAX_TIP = 1_000_000;
/** Frais agrégateur retenus pour le calcul du net. */
export const FEE_RATE = 0.012;

/**
 * Identifiant de référence marchande.
 *
 * ⚠️ Les identifiants Firestore font 20 caractères ; `crypto.randomUUID()` en
 * fait 36. La limite de longueur de `merchantReference` chez Bictorys n'est pas
 * documentée, et la découvrir sur une vraie transaction serait coûteux. On reste
 * donc sur 20 caractères, à parité exacte avec l'existant.
 */
export function paymentRef(): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export interface ChargeParams {
  amount: number;
  merchantReference: string;
  description: string;
  paymentType?: PaymentType;
  /** Chemin applicatif de retour ; `?paiement=succes|echec` y est ajouté. */
  redirectPath: string;
  /** Paramètres de retour bruts (utilisés par les dons : `?don=succes`). */
  redirectQuery?: { success: string; error: string };
}

export interface ChargeResult {
  checkoutUrl: string;
  providerTransactionId: string | null;
}

export async function postBictorysCharge(
  params: ChargeParams,
  cfg: { apiUrl: string; apiKey: string | undefined; appUrl: string },
): Promise<ChargeResult> {
  if (!cfg.apiKey) throw new ApiError("unavailable", "Paiement non configuré.");

  const q = params.redirectQuery ?? { success: "?paiement=succes", error: "?paiement=echec" };
  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: "XOF",
    country: "SN",
    successRedirectUrl: `${cfg.appUrl}${params.redirectPath}${q.success}`,
    // Casse d'origine conservée : l'API Bictorys attend bien `ErrorRedirectUrl`.
    ErrorRedirectUrl: `${cfg.appUrl}${params.redirectPath}${q.error}`,
    merchantReference: params.merchantReference,
    description: params.description,
  };
  // Sans `payment_type`, Bictorys affiche son checkout hébergé (tous moyens).
  if (params.paymentType) body.payment_type = params.paymentType;

  const res = await fetch(`${cfg.apiUrl}/pay/v1/charges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": cfg.apiKey,
      "Request-Id": params.merchantReference,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError("internal", `Bictorys a renvoyé ${res.status}.`);

  const data = (await res.json()) as Record<string, unknown>;
  const checkoutUrl =
    (data.checkoutUrl as string) ??
    (data.checkout_url as string) ??
    (data.link as string) ??
    (data.paymentLink as string);
  const providerTransactionId =
    (data.id as string) ?? (data.transactionId as string) ?? null;

  if (!checkoutUrl) {
    throw new ApiError("internal", "URL de paiement absente de la réponse Bictorys.");
  }
  return { checkoutUrl, providerTransactionId };
}

/** Statuts considérés comme payés — variantes conservées faute de doc confirmée. */
export function isPaidStatus(status: string | undefined): boolean {
  return status === "succeeded" || status === "success" || status === "paid";
}

import { useState } from "react";
import { HeartHandshake, ShieldCheck } from "lucide-react";
import type { EquipmentNeed } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import { DONATION_AMOUNTS, PAYMENT_METHODS } from "@/lib/constants";
import { formatFcfa, percent } from "@/lib/format";
import { useComingSoon } from "@/hooks/useToast";
import { isPaymentsEnabled, startDonation, type DonationPaymentType } from "@/services/payments";

/**
 * Maps the UI payment-method id (constants) to Bictorys' payment type.
 * "mobile_money" stays undefined so the donor picks Orange/MTN on the hosted checkout.
 */
const PAYMENT_TYPE_BY_METHOD: Record<string, DonationPaymentType | undefined> = {
  wave: "wave",
  card: "card",
};

/** Donation widget — Bictorys hosted checkout when enabled, else "coming soon". */
export function DonationWidget({ need }: { need: EquipmentNeed }) {
  const [amount, setAmount] = useState<number>(DONATION_AMOUNTS[1]);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0].id);
  const [loading, setLoading] = useState(false);
  const comingSoon = useComingSoon();
  const pct = percent(need.raisedAmount, need.targetAmount);
  const finalAmount = custom ? Number(custom) : amount;

  async function handleDonate() {
    if (!isPaymentsEnabled) {
      comingSoon("Le paiement en ligne arrive bientôt — aucun montant n'a été débité.");
      return;
    }
    setLoading(true);
    try {
      // Hosted checkout lets the donor pick the method; amount is re-validated server-side.
      await startDonation({
        needId: need.id,
        amount: finalAmount,
        paymentType: PAYMENT_TYPE_BY_METHOD[method],
      });
      // On success the browser is redirected to Bictorys; no further UI needed.
    } catch {
      comingSoon("Le paiement est momentanément indisponible. Réessayez plus tard.");
      setLoading(false);
    }
  }

  return (
    <div className="card-surface p-6">
      <h2 className="text-lg font-bold text-text-primary">Soutenir ce besoin</h2>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-brand-green">{formatFcfa(need.raisedAmount)}</span>
          <span className="text-sm text-text-secondary">{pct}%</span>
        </div>
        <ProgressBar value={pct} />
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Objectif : {formatFcfa(need.targetAmount)}</span>
          <span>{need.donorsCount} donateurs</span>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold text-text-primary">Choisir un montant</legend>
        <div className="grid grid-cols-3 gap-2">
          {DONATION_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => {
                setAmount(amt);
                setCustom("");
              }}
              className={cn(
                "min-h-[44px] rounded-xl border px-2 text-sm font-semibold transition-colors",
                !custom && amount === amt
                  ? "border-brand-green bg-brand-green/10 text-brand-green"
                  : "border-border-soft text-text-secondary hover:border-brand-teal",
              )}
            >
              {amt.toLocaleString("fr-FR")}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={500}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Autre montant (FCFA)"
          className="mt-2 h-11 w-full rounded-xl border border-border-soft bg-white px-3.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
        />
      </fieldset>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold text-text-primary">Méthode de paiement</legend>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                "min-h-[44px] rounded-xl border px-2 text-xs font-semibold transition-colors",
                method === m.id
                  ? "border-brand-green bg-brand-green/10 text-brand-green"
                  : "border-border-soft text-text-secondary hover:border-brand-teal",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      <Button
        fullWidth
        size="lg"
        className="mt-5"
        disabled={!finalAmount || finalAmount < 500 || loading}
        onClick={handleDonate}
      >
        <HeartHandshake className="h-5 w-5" />
        {loading ? "Redirection…" : `Soutenir ${finalAmount ? formatFcfa(finalAmount) : ""}`}
      </Button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-text-secondary">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand-green" />
        Paiement en ligne sécurisé bientôt disponible
      </p>
    </div>
  );
}

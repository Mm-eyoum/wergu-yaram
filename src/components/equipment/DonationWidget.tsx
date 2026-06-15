import { useState } from "react";
import { HeartHandshake, ShieldCheck } from "lucide-react";
import type { EquipmentNeed } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import { DONATION_AMOUNTS, PAYMENT_METHODS } from "@/lib/constants";
import { formatFcfa, percent } from "@/lib/format";

/** Donation widget — predefined FCFA amounts + payment method (UI-only). */
export function DonationWidget({ need }: { need: EquipmentNeed }) {
  const [amount, setAmount] = useState<number>(DONATION_AMOUNTS[1]);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0].id);
  const pct = percent(need.raisedAmount, need.targetAmount);
  const finalAmount = custom ? Number(custom) : amount;

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
                "rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors",
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
                "rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors",
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

      <Button fullWidth size="lg" className="mt-5" disabled={!finalAmount || finalAmount < 500}>
        <HeartHandshake className="h-5 w-5" />
        Soutenir {finalAmount ? formatFcfa(finalAmount) : ""}
      </Button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
        <ShieldCheck className="h-4 w-4 text-brand-green" />
        Paiement sécurisé · 100 % reversé au bénéficiaire
      </p>
    </div>
  );
}

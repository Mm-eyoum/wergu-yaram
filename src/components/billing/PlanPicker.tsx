import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/hooks/useToast";
import { fetchPricingPlans, startPlanCheckout } from "@/services/billing";
import { isPaymentsEnabled } from "@/services/payments";
import { formatFcfa } from "@/lib/format";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import type { PricingPlan } from "@/types/domain";

/**
 * Grille tarifaire des pages (Vérifié / Pro), annuel mis en avant (−20 %).
 * Lance le checkout d'abonnement Bictorys pour la page `orgId`.
 */
export function PlanPicker({
  orgId,
  currentPlanId,
}: {
  orgId: string;
  currentPlanId?: string;
}) {
  const { notify } = useToast();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["pricingPlans", "pages"],
    queryFn: () => fetchPricingPlans("pages"),
  });

  const visible = useMemo(
    () => plans.filter((p) => p.billingPeriod === cycle),
    [plans, cycle],
  );

  async function handleSelect(plan: PricingPlan) {
    track("subscribe_clicked", { planId: plan.id, orgId });
    if (!isPaymentsEnabled) {
      notify("Les abonnements en ligne arrivent très bientôt.", "info");
      return;
    }
    setPendingPlan(plan.id);
    try {
      await startPlanCheckout({ planId: plan.id, orgId });
    } catch {
      notify("Le paiement est momentanément indisponible. Réessayez plus tard.", "error");
      setPendingPlan(null);
    }
  }

  if (isLoading) return <LoadingState label="Chargement des offres…" />;
  if (visible.length === 0) return null;

  return (
    <div>
      {/* Cycle toggle */}
      <div className="mx-auto mb-5 inline-flex rounded-pill border border-border-soft bg-white p-1">
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            className={cn(
              "min-h-[36px] rounded-pill px-4 text-sm font-semibold transition-colors",
              cycle === c ? "bg-brand-green text-white" : "text-text-secondary hover:text-brand-green",
            )}
          >
            {c === "monthly" ? "Mensuel" : "Annuel −20 %"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((plan) => {
          const isPro = plan.id.includes("pro");
          const isCurrent = plan.id === currentPlanId;
          return (
            <div
              key={plan.id}
              className={cn(
                "card-surface relative flex flex-col p-6",
                isPro && "ring-2 ring-brand-green",
              )}
            >
              {isPro && (
                <span className="absolute -top-3 left-6">
                  <Badge tone="green" icon={<Sparkles className="h-3.5 w-3.5" />}>
                    Recommandé
                  </Badge>
                </span>
              )}
              <div className="flex items-center gap-2">
                <BadgeCheck className={cn("h-5 w-5", isPro ? "text-brand-green" : "text-brand-teal")} />
                <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
              </div>
              <p className="mt-1 text-sm text-text-secondary">{plan.description}</p>
              <p className="mt-4">
                <span className="text-2xl font-extrabold text-text-primary">{formatFcfa(plan.price)}</span>
                <span className="text-sm text-text-secondary">
                  {" "}/ {plan.billingPeriod === "yearly" ? "an" : "mois"}
                </span>
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-text-secondary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5"
                fullWidth
                variant={isPro ? "primary" : "outline"}
                disabled={isCurrent || pendingPlan === plan.id}
                onClick={() => handleSelect(plan)}
              >
                {isCurrent
                  ? "Plan actuel"
                  : pendingPlan === plan.id
                    ? "Redirection…"
                    : `Choisir ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>
      {!isPaymentsEnabled && (
        <p className="mt-3 text-center text-xs text-text-secondary">
          Paiement en ligne sécurisé bientôt disponible.
        </p>
      )}
    </div>
  );
}

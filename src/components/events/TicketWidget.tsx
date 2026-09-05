import { useState } from "react";
import { Minus, Plus, Ticket, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { startTicketCheckout } from "@/services/billing";
import { isPaymentsEnabled } from "@/services/payments";
import { formatFcfa } from "@/lib/format";
import { track } from "@/lib/analytics";
import type { HealthEvent } from "@/types/domain";

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="inline-flex items-center gap-1.5 text-text-secondary">
        {icon}
        {label}
      </dt>
      <dd className="font-semibold text-text-primary">{value}</dd>
    </div>
  );
}

/**
 * Inscription / billetterie d'un événement. Si la billetterie est activée et le
 * prix > 0 : sélecteur de quantité + achat (Bictorys). Sinon : inscription
 * gratuite (RSVP en ligne à venir).
 */
export function TicketWidget({ event }: { event: HealthEvent }) {
  const { notify } = useToast();
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const paid =
    Boolean(event.ticketingEnabled) &&
    typeof event.priceAmount === "number" &&
    event.priceAmount > 0;
  const soldOut = event.seatsLeft <= 0;
  const unit = event.priceAmount ?? 0;
  const tarif = paid ? formatFcfa(unit) : /gratuit|free|^0/i.test(event.price.trim()) ? "Gratuit" : event.price;

  async function handleBuy() {
    track("ticket_purchase_started", { eventId: event.id, quantity: qty });
    if (!isPaymentsEnabled) {
      notify("La billetterie en ligne arrive très bientôt.", "info");
      return;
    }
    setLoading(true);
    try {
      await startTicketCheckout({ eventId: event.id, quantity: qty });
    } catch {
      notify("Le paiement est momentanément indisponible. Réessayez plus tard.", "error");
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-lg font-bold text-text-primary">{paid ? "Billetterie" : "Inscription"}</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <Row icon={<Ticket className="h-4 w-4" />} label="Tarif" value={tarif} />
        <Row icon={<UserRound className="h-4 w-4" />} label="Places restantes" value={`${event.seatsLeft}`} />
      </dl>

      {paid && !soldOut && (
        <div className="mt-4">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">Quantité</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Diminuer"
              className="grid h-10 w-10 place-items-center rounded-xl border border-border-soft text-text-secondary hover:border-brand-teal disabled:opacity-50"
              disabled={qty <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2ch] text-center text-base font-bold">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(10, event.seatsLeft, q + 1))}
              aria-label="Augmenter"
              className="grid h-10 w-10 place-items-center rounded-xl border border-border-soft text-text-secondary hover:border-brand-teal disabled:opacity-50"
              disabled={qty >= Math.min(10, event.seatsLeft)}
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="ml-auto text-sm font-semibold text-brand-green">{formatFcfa(unit * qty)}</span>
          </div>
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        className="mt-4"
        disabled={soldOut || loading}
        onClick={paid ? handleBuy : () => notify("Les inscriptions en ligne arrivent bientôt.", "info")}
      >
        <Ticket className="h-5 w-5" />
        {soldOut
          ? "Complet"
          : loading
            ? "Redirection…"
            : paid
              ? `Acheter ${formatFcfa(unit * qty)}`
              : "S'inscrire à l'événement"}
      </Button>
      {paid && !isPaymentsEnabled && (
        <p className="mt-2 text-center text-xs text-text-secondary">
          Paiement en ligne sécurisé bientôt disponible.
        </p>
      )}
    </>
  );
}

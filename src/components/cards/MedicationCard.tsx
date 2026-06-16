import { Link } from "react-router-dom";
import { Pill } from "lucide-react";
import type { Medication } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { cardInteractive } from "./primitives";

const AWARE_TONE: Record<string, "green" | "warning" | "danger"> = {
  Access: "green",
  Watch: "warning",
  Reserve: "danger",
};

export function MedicationCard({ medication }: { medication: Medication }) {
  const subtitle = [medication.family, medication.forms?.slice(0, 2).join(", ")]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link to={`/medicaments/${medication.slug}`} className={`${cardInteractive} flex items-start gap-3 p-3`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-mint text-brand-green">
        <Pill className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-text-primary group-hover:text-brand-green">
          {medication.name} {medication.dosage}
        </h3>
        <p className="truncate text-xs text-text-secondary">{subtitle}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {medication.essentialMedicine && <Badge tone="mint">Essentiel</Badge>}
        {medication.withoutPrescription && <Badge tone="green">Sans ordonnance</Badge>}
        {medication.awareCategory && (
          <Badge tone={AWARE_TONE[medication.awareCategory]}>AWaRe {medication.awareCategory}</Badge>
        )}
      </div>
    </Link>
  );
}

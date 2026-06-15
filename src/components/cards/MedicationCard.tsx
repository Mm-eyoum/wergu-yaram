import { Link } from "react-router-dom";
import { Pill } from "lucide-react";
import type { Medication } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";

export function MedicationCard({ medication }: { medication: Medication }) {
  return (
    <Link
      to={`/medicaments/${medication.slug}`}
      className="card-surface group flex items-center gap-3 p-3 transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-mint text-brand-green">
        <Pill className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-text-primary group-hover:text-brand-green">
          {medication.name} {medication.dosage}
        </h3>
        <p className="truncate text-xs text-text-secondary">{medication.family}</p>
      </div>
      {medication.withoutPrescription && (
        <Badge tone="green" className="shrink-0">
          Sans ordonnance
        </Badge>
      )}
    </Link>
  );
}

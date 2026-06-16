import { Link } from "react-router-dom";
import { Activity, Pill, Stethoscope } from "lucide-react";
import type { Pathology } from "@/types/domain";
import { MetaItem, cardInteractive } from "./primitives";

export function PathologyCard({ pathology }: { pathology: Pathology }) {
  const symptoms = pathology.symptoms?.length ?? 0;
  const meds = pathology.commonMedications?.length ?? 0;
  return (
    <Link to={`/pathologies/${pathology.slug}`} className={`${cardInteractive} flex items-start gap-3 p-3`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-mint text-brand-green">
        <Activity className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-text-primary group-hover:text-brand-green">
          {pathology.name}
        </h3>
        <p className="truncate text-xs text-text-secondary">{pathology.category}</p>
        {pathology.summary && (
          <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">{pathology.summary}</p>
        )}
        {(symptoms > 0 || meds > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {symptoms > 0 && (
              <MetaItem icon={<Stethoscope className="h-3.5 w-3.5" />}>{symptoms} symptômes</MetaItem>
            )}
            {meds > 0 && <MetaItem icon={<Pill className="h-3.5 w-3.5" />}>{meds} médicaments</MetaItem>}
          </div>
        )}
      </div>
    </Link>
  );
}

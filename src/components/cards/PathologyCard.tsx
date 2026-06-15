import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import type { Pathology } from "@/types/domain";

export function PathologyCard({ pathology }: { pathology: Pathology }) {
  return (
    <Link
      to={`/pathologies/${pathology.slug}`}
      className="card-surface group flex items-center gap-3 p-3 transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-mint text-brand-green">
        <Activity className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-text-primary group-hover:text-brand-green">
          {pathology.name}
        </h3>
        <p className="truncate text-xs text-text-secondary">{pathology.category}</p>
      </div>
    </Link>
  );
}

import { Link } from "react-router-dom";
import { MapPin, Users } from "lucide-react";
import type { EquipmentNeed } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ButtonLink } from "@/components/ui/Button";
import { formatFcfa, percent } from "@/lib/format";

const URGENCY: Record<EquipmentNeed["urgency"], { label: string; tone: "danger" | "warning" | "neutral" }> = {
  urgent: { label: "Urgent", tone: "danger" },
  eleve: { label: "Priorité élevée", tone: "warning" },
  modere: { label: "Modéré", tone: "neutral" },
};

export function EquipmentNeedCard({ need }: { need: EquipmentNeed }) {
  const pct = percent(need.raisedAmount, need.targetAmount);
  const urgency = URGENCY[need.urgency];
  return (
    <article className="card-surface group overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-card">
      <div className="relative h-36 overflow-hidden">
        <img
          src={need.cover}
          alt=""
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute left-3 top-3">
          <Badge tone={urgency.tone}>{urgency.label}</Badge>
        </span>
      </div>
      <div className="p-4">
        <Link to={`/besoins/${need.id}`}>
          <h3 className="line-clamp-1 font-bold text-text-primary group-hover:text-brand-green">
            {need.title}
          </h3>
        </Link>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-text-secondary">
          <MapPin className="h-3.5 w-3.5" />
          {need.facilityName} · {need.region}
        </p>

        <div className="mt-3">
          <ProgressBar value={pct} />
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-brand-green">{formatFcfa(need.raisedAmount)}</span>
            <span className="text-text-secondary">{pct}%</span>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            Objectif : {formatFcfa(need.targetAmount)}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
            <Users className="h-3.5 w-3.5" />
            {need.donorsCount} donateurs
          </span>
          <ButtonLink to={`/besoins/${need.id}`} size="sm">
            Soutenir
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

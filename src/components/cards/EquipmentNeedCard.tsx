import { Link } from "react-router-dom";
import { CalendarClock, HeartHandshake, MapPin, Users } from "lucide-react";
import type { EquipmentNeed } from "@/types/domain";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFcfa, percent } from "@/lib/format";
import { CardMedia, OverlayBadge, MetaItem, CardCta, cardInteractive } from "./primitives";

const URGENCY: Record<EquipmentNeed["urgency"], { label: string; text: string }> = {
  urgent: { label: "Urgent", text: "text-danger" },
  eleve: { label: "Priorité élevée", text: "text-[#9a6512]" },
  modere: { label: "Modéré", text: "text-text-secondary" },
};

export function EquipmentNeedCard({ need }: { need: EquipmentNeed }) {
  const pct = percent(need.raisedAmount, need.targetAmount);
  const urgency = URGENCY[need.urgency];

  return (
    <Link to={`/besoins/${need.id}`} className={`${cardInteractive} block overflow-hidden`}>
      <CardMedia
        src={need.cover}
        fallback={<HeartHandshake className="h-9 w-9" />}
        height="md"
        overlayTopLeft={<OverlayBadge className={urgency.text}>{urgency.label}</OverlayBadge>}
        overlayTopRight={<OverlayBadge className="text-brand-green">{need.category}</OverlayBadge>}
      />

      <div className="p-4">
        <h3 className="line-clamp-1 font-bold text-text-primary group-hover:text-brand-green">
          {need.title}
        </h3>
        <MetaItem icon={<MapPin className="h-3.5 w-3.5" />} className="mt-1">
          {need.facilityName} · {need.region}
        </MetaItem>

        <div className="mt-3">
          <ProgressBar value={pct} />
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-brand-green">{formatFcfa(need.raisedAmount)}</span>
            <span className="text-text-secondary">{pct}%</span>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">Objectif : {formatFcfa(need.targetAmount)}</p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-soft pt-3">
          <div className="flex flex-col gap-1">
            <MetaItem icon={<Users className="h-3.5 w-3.5" />}>{need.donorsCount} donateurs</MetaItem>
            <MetaItem icon={<CalendarClock className="h-3.5 w-3.5" />}>
              {need.daysLeft} j restants
            </MetaItem>
          </div>
          <CardCta>Soutenir</CardCta>
        </div>
      </div>
    </Link>
  );
}

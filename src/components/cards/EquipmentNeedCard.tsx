import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, HeartHandshake, MapPin, Users } from "lucide-react";
import type { EquipmentNeed } from "@/types/domain";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFcfa, percent } from "@/lib/format";
import { CardMedia, OverlayBadge, MetaItem, CardCta, cardInteractive } from "./primitives";

const URGENCY_TEXT: Record<EquipmentNeed["urgency"], string> = {
  urgent: "text-danger",
  eleve: "text-[#9a6512]",
  modere: "text-text-secondary",
};

export function EquipmentNeedCard({ need }: { need: EquipmentNeed }) {
  const { t } = useTranslation("cards");
  const pct = percent(need.raisedAmount, need.targetAmount);

  return (
    <Link to={`/besoins/${need.id}`} className={`${cardInteractive} block overflow-hidden`}>
      <CardMedia
        src={need.cover}
        fallback={<HeartHandshake className="h-9 w-9" />}
        height="md"
        overlayTopLeft={<OverlayBadge className={URGENCY_TEXT[need.urgency]}>{t(`urgency.${need.urgency}`)}</OverlayBadge>}
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
          <p className="mt-0.5 text-xs text-text-secondary">{t("goal", { amount: formatFcfa(need.targetAmount) })}</p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-soft pt-3">
          <div className="flex flex-col gap-1">
            <MetaItem icon={<Users className="h-3.5 w-3.5" />}>{t("donors", { count: need.donorsCount })}</MetaItem>
            <MetaItem icon={<CalendarClock className="h-3.5 w-3.5" />}>
              {t("daysLeft", { count: need.daysLeft })}
            </MetaItem>
          </div>
          <CardCta>{t("support")}</CardCta>
        </div>
      </div>
    </Link>
  );
}

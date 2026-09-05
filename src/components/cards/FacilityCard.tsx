import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BadgeCheck, Building2, MapPin, Navigation, Star } from "lucide-react";
import type { Facility } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { categoryLabel, sectorLabel } from "@/lib/facilityTaxonomy";
import { formatDistance } from "@/lib/geo";
import { CardMedia, OverlayBadge, MetaItem, PillList, cardInteractive } from "./primitives";

export function FacilityCard({
  facility,
  distanceKm,
  href,
  badge,
}: {
  facility: Facility;
  distanceKm?: number;
  /** Override the link target (e.g. directory orgs → /structures/:id). */
  href?: string;
  /** Optional source badge (e.g. "Annuaire") shown over the cover. */
  badge?: string;
}) {
  const { t } = useTranslation("cards");
  const needsCount = facility.equipmentNeeds?.length ?? 0;
  const typeLabel = categoryLabel(facility.category) || facility.type;
  const sector = sectorLabel(facility.sector);

  return (
    <Link to={href ?? `/etablissements/${facility.slug}`} className={`${cardInteractive} block overflow-hidden`}>
      <CardMedia
        src={facility.cover}
        fallback={<Building2 className="h-9 w-9" />}
        height="sm"
        overlayTopLeft={badge ? <OverlayBadge className="text-brand-green">{badge}</OverlayBadge> : undefined}
        overlayTopRight={
          facility.rating > 0 ? (
            <OverlayBadge icon={<Star className="h-3.5 w-3.5 fill-warning text-warning" />}>
              {facility.rating.toFixed(1)}
            </OverlayBadge>
          ) : undefined
        }
      />

      <div className="p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          {typeLabel && <Badge tone="navy">{typeLabel}</Badge>}
          {sector && <Badge tone="mint">{sector}</Badge>}
          {facility.verified && (
            <Badge tone="green" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
              {t("verified")}
            </Badge>
          )}
        </div>

        <h3 className="line-clamp-1 font-bold text-text-primary group-hover:text-brand-green">
          {facility.name}
        </h3>
        <MetaItem icon={<MapPin className="h-3.5 w-3.5" />} className="mt-1">
          {facility.city}, {facility.region}
        </MetaItem>

        {facility.specialties.length > 0 && (
          <div className="mt-2">
            <PillList items={facility.specialties} max={2} />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
          {distanceKm != null ? (
            <MetaItem icon={<Navigation className="h-3.5 w-3.5" />} className="font-semibold text-brand-green">
              {t("distanceAway", { distance: formatDistance(distanceKm) })}
            </MetaItem>
          ) : needsCount > 0 ? (
            <span className="text-xs font-semibold text-brand-green">
              {t("needs", { count: needsCount })}
            </span>
          ) : facility.reviewsCount > 0 ? (
            <span className="text-xs text-text-secondary">{t("reviews", { count: facility.reviewsCount })}</span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green group-hover:gap-1.5">
            {t("view")} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

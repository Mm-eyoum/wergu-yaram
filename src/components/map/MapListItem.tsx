import { Link } from "react-router-dom";
import { Navigation } from "lucide-react";
import type { Coords } from "@/types/domain";
import { openDirections } from "@/lib/geo";
import { PIN_COLORS, type PinColor } from "./leafletSetup";

interface MapListItemProps {
  name: string;
  meta: string;
  distanceLabel?: string;
  color: PinColor;
  badge?: string;
  href: string;
  coords: Coords;
  active?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
  onSelect?: () => void;
}

/** Compact result row in the discovery map's side panel, synced with the map. */
export function MapListItem({
  name,
  meta,
  distanceLabel,
  color,
  badge,
  href,
  coords,
  active,
  onHover,
  onLeave,
  onSelect,
}: MapListItemProps) {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onSelect}
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${
        active ? "border-brand-teal bg-brand-mint/40" : "border-border-soft bg-white hover:border-brand-teal"
      }`}
    >
      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
        style={{ backgroundColor: PIN_COLORS[color] }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={href}
            onClick={(e) => e.stopPropagation()}
            onFocus={onHover}
            className="truncate text-sm font-bold text-text-primary hover:text-brand-green"
          >
            {name}
          </Link>
          {badge && (
            <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-[#9a6512]">
              {badge}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-text-secondary">{meta}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {distanceLabel ? (
            <span className="text-xs font-semibold text-brand-green">{distanceLabel}</span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDirections(coords);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-border-soft px-2 py-1 text-xs font-semibold text-text-primary transition-colors hover:border-brand-teal hover:text-brand-green"
          >
            <Navigation className="h-3 w-3" /> Itinéraire
          </button>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Navigation } from "lucide-react";
import type { Coords } from "@/types/domain";
import { openDirections } from "@/lib/geo";

interface MarkerPopupProps {
  title: string;
  subtitle?: string;
  /** Distance label (e.g. "à 3,2 km") when the user's position is known. */
  distanceLabel?: string;
  /** Internal route to the detail page. */
  href?: string;
  /** Destination for the "Itinéraire" button. */
  coords: Coords;
}

/** Standard content rendered inside a map marker popup. */
export function MarkerPopup({ title, subtitle, distanceLabel, href, coords }: MarkerPopupProps) {
  return (
    <div className="min-w-[180px] space-y-1.5">
      <p className="text-sm font-bold text-text-primary">{title}</p>
      {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
      {distanceLabel && <p className="text-xs font-semibold text-brand-green">{distanceLabel}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {href && (
          <Link
            to={href}
            className="rounded-lg bg-brand-green px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-greenDark"
          >
            Voir la fiche
          </Link>
        )}
        <button
          type="button"
          onClick={() => openDirections(coords)}
          className="inline-flex items-center gap-1 rounded-lg border border-border-soft px-2.5 py-1 text-xs font-semibold text-text-primary hover:border-brand-teal hover:text-brand-green"
        >
          <Navigation className="h-3 w-3" /> Itinéraire
        </button>
      </div>
    </div>
  );
}

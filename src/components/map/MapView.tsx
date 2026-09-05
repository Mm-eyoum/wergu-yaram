import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { LocateFixed } from "lucide-react";
import type { ReactNode } from "react";
import type { Marker as LeafletMarker } from "leaflet";
import type { Coords } from "@/types/domain";
import { DAKAR_CENTER, DEFAULT_ZOOM } from "@/lib/geo";
import { L, pinIcon, categoryPinIcon, clusterIcon, userLocationIcon, type PinColor, type PinGlyph } from "./leafletSetup";

export interface MapMarker {
  id: string;
  coords: Coords;
  color?: PinColor;
  glyph?: PinGlyph;
  /** When set, the pin is styled by health-structure category (color + glyph). */
  category?: string;
  /** Force the amber "unclaimed directory" color (overrides category color). */
  amber?: boolean;
  popup?: ReactNode;
  title?: string;
}

interface MapViewProps {
  markers?: MapMarker[];
  center?: Coords;
  zoom?: number;
  /** Show the styled "you are here" marker. */
  userCoords?: Coords | null;
  clustering?: boolean;
  fitToMarkers?: boolean;
  /** Marker shown active + flown-to + popup-opened (synced from a list). */
  selectedId?: string | null;
  /** Marker shown active (e.g. hovered in a list), without recentering. */
  hoveredId?: string | null;
  onMarkerClick?: (id: string) => void;
  /** Renders a "locate me" button over the map. */
  onLocate?: () => void;
  className?: string;
}

const CARTO_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Recenters / refits the map when its inputs change. */
function ViewportController({
  markers,
  center,
  zoom,
  fitToMarkers,
}: {
  markers: MapMarker[];
  center: Coords;
  zoom: number;
  fitToMarkers?: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (fitToMarkers && markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.coords.lat, m.coords.lng]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    } else {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [map, markers, center.lat, center.lng, zoom, fitToMarkers]);
  return null;
}

/** Flies to the selected marker and opens its popup. */
function SelectionController({
  markers,
  selectedId,
  markerRefs,
}: {
  markers: MapMarker[];
  selectedId?: string | null;
  markerRefs: React.MutableRefObject<Map<string, LeafletMarker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const m = markers.find((x) => x.id === selectedId);
    if (m) map.flyTo([m.coords.lat, m.coords.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    const ref = markerRefs.current.get(selectedId);
    if (ref) window.setTimeout(() => ref.openPopup(), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
  return null;
}

/**
 * Generic interactive Leaflet map — CARTO Voyager basemap (key-free), brand pins
 * and clusters, list↔map selection sync. Lazy-load via {@link LazyMapView}.
 */
export default function MapView({
  markers = [],
  center,
  zoom = DEFAULT_ZOOM,
  userCoords,
  clustering = false,
  fitToMarkers = false,
  selectedId,
  hoveredId,
  onMarkerClick,
  onLocate,
  className = "h-72 w-full",
}: MapViewProps) {
  const resolvedCenter = center ?? markers[0]?.coords ?? userCoords ?? DAKAR_CENTER;
  const markerRefs = useRef<Map<string, LeafletMarker>>(new Map());

  const markerEls = useMemo(
    () =>
      markers.map((m) => {
        const active = m.id === selectedId || m.id === hoveredId;
        return (
          <Marker
            key={m.id}
            position={[m.coords.lat, m.coords.lng]}
            icon={
              m.category !== undefined || m.amber
                ? categoryPinIcon(m.category, { active, amber: m.amber })
                : pinIcon(m.color ?? "green", { active, glyph: m.glyph })
            }
            title={m.title}
            ref={(r) => {
              if (r) markerRefs.current.set(m.id, r);
              else markerRefs.current.delete(m.id);
            }}
            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(m.id) } : undefined}
          >
            {m.popup ? <Popup>{m.popup}</Popup> : null}
          </Marker>
        );
      }),
    [markers, selectedId, hoveredId, onMarkerClick],
  );

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={[resolvedCenter.lat, resolvedCenter.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full rounded-2xl"
        style={{ zIndex: 0 }}
      >
        <TileLayer attribution={CARTO_ATTR} url={CARTO_URL} subdomains="abcd" />
        <ViewportController markers={markers} center={resolvedCenter} zoom={zoom} fitToMarkers={fitToMarkers} />
        <SelectionController markers={markers} selectedId={selectedId} markerRefs={markerRefs} />
        {clustering ? (
          <MarkerClusterGroup
            chunkedLoading
            showCoverageOnHover={false}
            iconCreateFunction={(cluster: { getChildCount: () => number }) =>
              clusterIcon(cluster.getChildCount())
            }
          >
            {markerEls}
          </MarkerClusterGroup>
        ) : (
          markerEls
        )}
        {userCoords && (
          <Marker position={[userCoords.lat, userCoords.lng]} icon={userLocationIcon()}>
            <Popup>Vous êtes ici</Popup>
          </Marker>
        )}
      </MapContainer>

      {onLocate && (
        <button
          type="button"
          onClick={onLocate}
          title="Me localiser"
          aria-label="Me localiser"
          className="absolute right-3 top-3 z-[500] grid h-10 w-10 place-items-center rounded-xl border border-border-soft bg-white text-text-primary shadow-soft transition-colors hover:text-brand-green"
        >
          <LocateFixed className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

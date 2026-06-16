import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { ReactNode } from "react";
import type { Coords } from "@/types/domain";
import { DAKAR_CENTER, DEFAULT_ZOOM } from "@/lib/geo";
import { L, pinIcon, type PinColor } from "./leafletSetup";

export interface MapMarker {
  id: string;
  coords: Coords;
  color?: PinColor;
  popup?: ReactNode;
  title?: string;
}

interface MapViewProps {
  markers?: MapMarker[];
  center?: Coords;
  zoom?: number;
  /** Show a distinct dot for the user's current position. */
  userCoords?: Coords | null;
  /** Cluster nearby markers (use on the discovery map with many pins). */
  clustering?: boolean;
  /** Auto-fit the viewport to all markers. */
  fitToMarkers?: boolean;
  className?: string;
  onMarkerClick?: (id: string) => void;
}

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
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [map, markers, center.lat, center.lng, zoom, fitToMarkers]);
  return null;
}

/**
 * Generic interactive Leaflet map (OSM tiles, key-free). Lazy-load via
 * {@link LazyMapView} so Leaflet stays out of pages that don't render a map.
 */
export default function MapView({
  markers = [],
  center,
  zoom = DEFAULT_ZOOM,
  userCoords,
  clustering = false,
  fitToMarkers = false,
  className = "h-72 w-full",
  onMarkerClick,
}: MapViewProps) {
  const resolvedCenter = center ?? markers[0]?.coords ?? userCoords ?? DAKAR_CENTER;

  const pins = useMemo(
    () =>
      markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.coords.lat, m.coords.lng]}
          icon={pinIcon(m.color ?? "green")}
          title={m.title}
          eventHandlers={onMarkerClick ? { click: () => onMarkerClick(m.id) } : undefined}
        >
          {m.popup ? <Popup>{m.popup}</Popup> : null}
        </Marker>
      )),
    [markers, onMarkerClick],
  );

  return (
    <MapContainer
      center={[resolvedCenter.lat, resolvedCenter.lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      className={`${className} rounded-2xl`}
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ViewportController markers={markers} center={resolvedCenter} zoom={zoom} fitToMarkers={fitToMarkers} />
      {clustering ? <MarkerClusterGroup chunkedLoading>{pins}</MarkerClusterGroup> : pins}
      {userCoords && (
        <CircleMarker
          center={[userCoords.lat, userCoords.lng]}
          radius={8}
          pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 2 }}
        >
          <Popup>Vous êtes ici</Popup>
        </CircleMarker>
      )}
    </MapContainer>
  );
}

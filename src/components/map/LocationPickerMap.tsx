import { useMapEvents } from "react-leaflet";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { Marker as LeafletMarker } from "leaflet";
import type { Coords } from "@/types/domain";
import { DAKAR_CENTER } from "@/lib/geo";
import { pinIcon } from "./leafletSetup";

interface Props {
  value: Coords | null;
  onPick: (coords: Coords) => void;
  className?: string;
}

function Recenter({ coords }: { coords: Coords | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 15));
  }, [map, coords]);
  return null;
}

function ClickToPlace({ onPick }: { onPick: (c: Coords) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Draggable-pin map for picking an exact location in a form. */
export default function LocationPickerMap({ value, onPick, className = "h-56 w-full" }: Props) {
  const center = value ?? DAKAR_CENTER;
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={value ? 15 : 12}
      scrollWheelZoom={false}
      className={`${className} rounded-2xl`}
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />
      <ClickToPlace onPick={onPick} />
      <Recenter coords={value} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={pinIcon("navy")}
          draggable
          eventHandlers={{
            dragend(e) {
              const m = e.target as LeafletMarker;
              const pos = m.getLatLng();
              onPick({ lat: pos.lat, lng: pos.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}

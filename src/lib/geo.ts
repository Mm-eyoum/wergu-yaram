/** Geospatial helpers: distance, formatting, and external navigation deep-links. */
import type { Coords } from "@/types/domain";

/** Map fallback center (Dakar) when no user/location context is available. */
export const DAKAR_CENTER: Coords = { lat: 14.7167, lng: -17.4677 };

/** Default zoom for a single-marker map (street level). */
export const DEFAULT_ZOOM = 14;

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometers (Haversine). */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Human-readable distance in French: "850 m", "3,2 km", "12 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

/** True when an object carries usable coordinates. */
export function hasCoords(value: { coords?: Coords | null } | null | undefined): value is { coords: Coords } {
  const c = value?.coords;
  return !!c && Number.isFinite(c.lat) && Number.isFinite(c.lng);
}

export type DirectionsProvider = "google" | "waze" | "apple";

/** Build a deep-link to navigate to `to` in an external maps app. */
export function directionsUrl(to: Coords, provider: DirectionsProvider = "google"): string {
  const { lat, lng } = to;
  switch (provider) {
    case "waze":
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    case "apple":
      return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    case "google":
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
}

/** Open turn-by-turn directions to a point in a new tab (default: Google Maps). */
export function openDirections(to: Coords, provider: DirectionsProvider = "google"): void {
  window.open(directionsUrl(to, provider), "_blank", "noopener,noreferrer");
}

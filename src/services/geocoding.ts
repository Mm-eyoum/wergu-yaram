/**
 * Key-free geocoding using OpenStreetMap-backed services:
 *  - Photon (komoot) for forward search / autocomplete
 *  - Nominatim for reverse geocoding (coords → address)
 * Both are free and require no API key. Respect Nominatim usage policy
 * (debounced calls, identifying header where possible).
 */
import type { Coords } from "@/types/domain";

export interface GeoSuggestion {
  label: string;
  address: string;
  city: string;
  coords: Coords;
}

/** Bias results towards Senegal (Dakar) so local places rank first. */
const BIAS = { lat: 14.7167, lon: -17.4677 };

function buildLabel(props: Record<string, unknown>): { address: string; city: string } {
  const city =
    (props.city as string) ||
    (props.town as string) ||
    (props.village as string) ||
    (props.county as string) ||
    "";
  const parts = [
    props.name as string,
    props.street as string,
    props.district as string,
    city,
    props.state as string,
  ].filter(Boolean);
  return { address: parts.join(", "), city };
}

/** Forward search / autocomplete. Returns up to `limit` suggestions. */
export async function searchAddress(query: string, limit = 6): Promise<GeoSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limit}&lang=fr&lat=${BIAS.lat}&lon=${BIAS.lon}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: { properties: Record<string, unknown>; geometry: { coordinates: [number, number] } }[];
    };
    return (data.features ?? []).map((f) => {
      const { address, city } = buildLabel(f.properties);
      const [lng, lat] = f.geometry.coordinates;
      const label = address || (f.properties.name as string) || `${lat}, ${lng}`;
      return { label, address: label, city, coords: { lat, lng } };
    });
  } catch {
    return [];
  }
}

/** Reverse geocoding: coordinates → human-readable address. */
export async function reverseGeocode(coords: Coords): Promise<{ address: string; city: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&accept-language=fr`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { address: "", city: "" };
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const city = a.city || a.town || a.village || a.county || "";
    return { address: data.display_name ?? "", city };
  } catch {
    return { address: "", city: "" };
  }
}

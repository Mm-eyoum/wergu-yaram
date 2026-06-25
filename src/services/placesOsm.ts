/**
 * Directory import via OpenStreetMap — gratuit, sans clé API.
 *
 * Remplace Google Places : on résout la région en bounding box (Nominatim, déjà
 * utilisé pour le géocodage) puis on interroge l'Overpass API pour tous les POI
 * de santé de la zone. Un seul appel renvoie déjà tous les tags (nom, adresse,
 * téléphone, horaires, coords) → pas de N+1 facturé.
 *
 * ⚠️ Données sous licence ODbL (OpenStreetMap) : l'attribution est affichée sur
 * les fiches importées (champ `source:"imported"` + mention OSM côté UI).
 */
import {
  alreadyImported,
  assertDb,
  auditImport,
  categoryForTypeLabel,
  IMPORT_CAP,
  writeImportedFacility,
  type DirectorySearchParams,
  type ImportedFacilityInput,
  type PlaceCandidate,
} from "./placesShared";
import { placeTypesToCategory, inferCategoryFromName } from "@/lib/facilityTaxonomy";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const HEALTH_AMENITIES = ["hospital", "clinic", "pharmacy", "doctors", "dentist"];

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Cache des éléments OSM de la dernière recherche, indexé par placeId, pour que
 * l'import (qui ne reçoit que des placeIds) retrouve les données complètes sans
 * second appel réseau. Limité à la session courante.
 */
const elementCache = new Map<string, ImportedFacilityInput>();

/** Resolve a region name to an OSM bounding box (south, west, north, east). */
async function regionBbox(region: string): Promise<[number, number, number, number] | null> {
  const q = `${region}, Sénégal`;
  const url = `${NOMINATIM_URL}?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&countrycodes=sn`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { boundingbox?: [string, string, string, string] }[];
    const bb = data[0]?.boundingbox;
    if (!bb) return null;
    // Nominatim: [southLat, northLat, westLon, eastLon] → Overpass (S, W, N, E).
    return [Number(bb[0]), Number(bb[2]), Number(bb[1]), Number(bb[3])];
  } catch {
    return null;
  }
}

function coordsOf(el: OverpassElement): { lat: number; lng: number } | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  return typeof lat === "number" && typeof lon === "number" ? { lat, lng: lon } : null;
}

function addressOf(tags: Record<string, string>): string {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:suburb"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.join(", ");
}

/** Normalise an Overpass element into importable facility fields (region added later). */
function normalise(el: OverpassElement): ImportedFacilityInput | null {
  const tags = el.tags ?? {};
  const name = tags.name?.trim();
  const coords = coordsOf(el);
  if (!name || !coords) return null; // unnamed / positionless POIs are not useful
  const category =
    placeTypesToCategory([tags.amenity, tags.healthcare]) ?? inferCategoryFromName(name);
  return {
    placeId: `osm/${el.type}/${el.id}`,
    name,
    category,
    region: "",
    city: tags["addr:city"] ?? "",
    address: addressOf(tags) || tags["addr:full"] || "",
    phone: tags.phone ?? tags["contact:phone"] ?? "",
    hours: tags.opening_hours ?? "",
    rating: 0,
    coords,
  };
}

/** Search health structures in a region via Overpass, optionally filtered by type/keyword. */
export async function searchPlacesOsm(params: DirectorySearchParams): Promise<PlaceCandidate[]> {
  assertDb();
  const bbox = await regionBbox(params.region);
  if (!bbox) throw new Error(`Zone introuvable : « ${params.region} ».`);
  const [s, w, n, e] = bbox;
  const amenityRe = `^(${HEALTH_AMENITIES.join("|")})$`;
  const query = `[out:json][timeout:25];
(
  nwr["amenity"~"${amenityRe}"](${s},${w},${n},${e});
  nwr["healthcare"](${s},${w},${n},${e});
);
out center tags 250;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass a renvoyé ${res.status}.`);
  const data = (await res.json()) as { elements?: OverpassElement[] };

  const wantedCategory = params.type ? categoryForTypeLabel(params.type) : undefined;
  const keyword = params.keyword?.trim().toLowerCase();

  const seen = new Set<string>();
  const inputs: ImportedFacilityInput[] = [];
  for (const el of data.elements ?? []) {
    const input = normalise(el);
    if (!input || seen.has(input.placeId)) continue;
    if (wantedCategory && input.category !== wantedCategory) continue;
    if (keyword && !`${input.name} ${input.address}`.toLowerCase().includes(keyword)) continue;
    seen.add(input.placeId);
    inputs.push(input);
  }

  // Cache for import, then flag those already in the directory.
  elementCache.clear();
  for (const input of inputs) elementCache.set(input.placeId, input);

  return Promise.all(
    inputs.map(async (input) => ({
      placeId: input.placeId,
      name: input.name,
      address: input.address || input.city,
      coords: input.coords,
      rating: null,
      alreadyImported: await alreadyImported(input.placeId),
    })),
  );
}

/** Import selected OSM places as unclaimed directory pages (admin only, per rules). */
export async function importPlacesOsm(
  placeIds: string[],
  region?: string,
): Promise<{ imported: number; skipped: number }> {
  assertDb();
  if (placeIds.length > IMPORT_CAP) {
    throw new Error(
      `Import limité à ${IMPORT_CAP} structures par lot (${placeIds.length} sélectionnées). Réduisez la sélection.`,
    );
  }
  let imported = 0;
  let skipped = 0;
  for (const placeId of placeIds) {
    const cached = elementCache.get(placeId);
    if (!cached || (await alreadyImported(placeId))) {
      skipped++;
      continue;
    }
    await writeImportedFacility({ ...cached, region: region ?? "" });
    imported++;
  }
  await auditImport(region, placeIds.length, imported, skipped, placeIds);
  return { imported, skipped };
}

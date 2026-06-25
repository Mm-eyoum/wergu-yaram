/**
 * Admin directory import — fully client-side.
 *
 * Source choisie par VITE_DIRECTORY_SOURCE :
 *  - "osm" (défaut) : OpenStreetMap via Overpass (gratuit, sans clé) — voir
 *    services/placesOsm. Aucun coût récurrent.
 *  - "google" : Places API (New) appelée directement depuis le navigateur
 *    (fallback, facturé). La clé VITE_PLACES_API_KEY ship dans le bundle (modèle
 *    standard Maps/Places) et DOIT être restreinte dans Google Cloud Console à :
 *      - Référents HTTP : vos domaines + http://localhost:* en dev
 *      - API : « Places API (New) » uniquement
 *
 * Le contrôle d'accès est assuré par les règles Firestore : seul un admin peut
 * créer des fiches `source:"imported"`.
 */
import { searchPlacesOsm, importPlacesOsm } from "./placesOsm";
import {
  alreadyImported,
  assertDb,
  auditImport,
  IMPORT_CAP,
  writeImportedFacility,
  type DirectorySearchParams,
  type PlaceCandidate,
} from "./placesShared";
import { placeTypesToCategory, inferCategoryFromName } from "@/lib/facilityTaxonomy";

export { IMPORT_CAP };
export type { PlaceCandidate, DirectorySearchParams };

const directorySource = (import.meta.env.VITE_DIRECTORY_SOURCE as string | undefined) ?? "osm";
/** True quand l'import annuaire utilise OpenStreetMap (défaut). */
export const isOsmDirectorySource = directorySource !== "google";

const PLACES_KEY = import.meta.env.VITE_PLACES_API_KEY as string | undefined;
const PLACES_BASE = "https://places.googleapis.com/v1";

interface NewPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  /** Google Places type tags (e.g. "hospital", "pharmacy") — drives auto-category. */
  types?: string[];
  internationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  addressComponents?: { longText: string; types?: string[] }[];
}

function assertGoogleConfigured() {
  if (!PLACES_KEY) throw new Error("Clé Places absente : définissez VITE_PLACES_API_KEY.");
  assertDb();
}

/** Build the Places text query from structured params, scoped to the zone. */
function buildTextQuery(params: DirectorySearchParams): string {
  return [params.type, params.keyword?.trim(), params.region, "Sénégal"].filter(Boolean).join(" ");
}

/** Text search via Places API (New), flagging candidates already in the directory. */
async function searchPlacesGoogle(params: DirectorySearchParams): Promise<PlaceCandidate[]> {
  assertGoogleConfigured();
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_KEY!,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating",
    },
    body: JSON.stringify({ textQuery: buildTextQuery(params), regionCode: "SN", languageCode: "fr" }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? `Places a renvoyé ${res.status}.`);
  }
  const data = (await res.json()) as { places?: NewPlace[] };
  const places = (data.places ?? []).filter((p) => p.location);
  return Promise.all(
    places.map(async (p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "Structure de santé",
      address: p.formattedAddress ?? "",
      coords: { lat: p.location!.latitude, lng: p.location!.longitude },
      rating: p.rating ?? null,
      alreadyImported: await alreadyImported(p.id),
    })),
  );
}

/** Fetch full details for one place (phone, hours, city). */
async function placeDetails(placeId: string): Promise<NewPlace | null> {
  const res = await fetch(`${PLACES_BASE}/places/${placeId}?languageCode=fr`, {
    headers: {
      "X-Goog-Api-Key": PLACES_KEY!,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,location,rating,types,internationalPhoneNumber,regularOpeningHours.weekdayDescriptions,addressComponents",
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as NewPlace;
}

/** Import selected Google places as unclaimed directory pages (admin only, per rules). */
async function importPlacesGoogle(
  placeIds: string[],
  region?: string,
): Promise<{ imported: number; skipped: number }> {
  assertGoogleConfigured();
  if (placeIds.length > IMPORT_CAP) {
    throw new Error(
      `Import limité à ${IMPORT_CAP} structures par lot (${placeIds.length} sélectionnées). Réduisez la sélection.`,
    );
  }
  let imported = 0;
  let skipped = 0;
  for (const placeId of placeIds) {
    if (await alreadyImported(placeId)) {
      skipped++;
      continue;
    }
    const p = await placeDetails(placeId);
    if (!p?.location) {
      skipped++;
      continue;
    }
    const city = p.addressComponents?.find((c) => c.types?.includes("locality"))?.longText ?? "";
    const name = p.displayName?.text ?? "Structure de santé";
    const category = placeTypesToCategory(p.types) ?? inferCategoryFromName(name);
    await writeImportedFacility({
      placeId,
      name,
      category,
      region: region ?? "",
      city,
      address: p.formattedAddress ?? "",
      phone: p.internationalPhoneNumber ?? "",
      hours: p.regularOpeningHours?.weekdayDescriptions?.join(" · ") ?? "",
      rating: p.rating ?? 0,
      coords: { lat: p.location.latitude, lng: p.location.longitude },
    });
    imported++;
  }
  await auditImport(region, placeIds.length, imported, skipped, placeIds);
  return { imported, skipped };
}

// --- Source-agnostic dispatch (consumed by the admin panel) ----------------

/** Search the directory source (OSM by default, Google as fallback). */
export function searchPlaces(params: DirectorySearchParams): Promise<PlaceCandidate[]> {
  return isOsmDirectorySource ? searchPlacesOsm(params) : searchPlacesGoogle(params);
}

/** Import the selected places (OSM by default, Google as fallback). */
export function importPlaces(
  placeIds: string[],
  region?: string,
): Promise<{ imported: number; skipped: number }> {
  return isOsmDirectorySource ? importPlacesOsm(placeIds, region) : importPlacesGoogle(placeIds, region);
}

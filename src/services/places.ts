/**
 * Admin directory import — fully client-side.
 *
 * Calls the Places API (New) directly from the browser (CORS-enabled) and writes
 * imported facilities straight to Firestore. This avoids Cloud Functions entirely
 * (the project's org policy blocks function invocation). Access control is
 * enforced by Firestore rules: only an admin may create `source:"imported"` pages.
 *
 * The key (VITE_PLACES_API_KEY) ships in the client bundle — this is the standard
 * model for Maps/Places keys. It MUST be restricted in Google Cloud Console to:
 *   - HTTP referrers: your domain(s) + http://localhost:* for dev
 *   - API: "Places API (New)" only
 */
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query as fsQuery,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { logAudit } from "./audit";
import { placeTypesToCategory, inferCategoryFromName } from "@/lib/facilityTaxonomy";

const PLACES_KEY = import.meta.env.VITE_PLACES_API_KEY as string | undefined;
const PLACES_BASE = "https://places.googleapis.com/v1";
const ORGS = "organizations";

/**
 * Hard cap on a single bulk import. Bounds how much an admin can inject into the
 * public directory in one action (quality control + Places API cost). Larger
 * imports must be split into batches so each is reviewed.
 */
export const IMPORT_CAP = 20;

export interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  rating: number | null;
  alreadyImported: boolean;
}

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

function assertConfigured() {
  if (!PLACES_KEY) throw new Error("Clé Places absente : définissez VITE_PLACES_API_KEY.");
  if (!db) throw new Error("Firebase non configuré.");
}

/** True if a page with this Google placeId already exists (dedupe). */
async function alreadyImported(placeId: string): Promise<boolean> {
  const snap = await getDocs(
    fsQuery(collection(db!, ORGS), where("placeId", "==", placeId), limit(1)),
  );
  return !snap.empty;
}

/** Text search via Places API (New), flagging candidates already in the directory. */
export async function searchPlaces(text: string): Promise<PlaceCandidate[]> {
  assertConfigured();
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_KEY!,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating",
    },
    body: JSON.stringify({ textQuery: text, regionCode: "SN", languageCode: "fr" }),
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

/** Import selected places as unclaimed directory pages (admin only, per rules). */
export async function importPlaces(
  placeIds: string[],
  region?: string,
): Promise<{ imported: number; skipped: number }> {
  assertConfigured();
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
    const city =
      p.addressComponents?.find((c) => c.types?.includes("locality"))?.longText ?? "";
    const name = p.displayName?.text ?? "Structure de santé";
    const category = placeTypesToCategory(p.types) ?? inferCategoryFromName(name);
    await addDoc(collection(db!, ORGS), {
      type: "healthcare_facility",
      category,
      name,
      ownerUid: "",
      managerUids: [],
      status: "active",
      region: region ?? "",
      city,
      address: p.formattedAddress ?? "",
      coords: { lat: p.location.latitude, lng: p.location.longitude },
      phone: p.internationalPhoneNumber ?? "",
      hours: p.regularOpeningHours?.weekdayDescriptions?.join(" · ") ?? "",
      rating: p.rating ?? null,
      source: "imported",
      placeId,
      claimStatus: "unclaimed",
      logo: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    imported++;
  }
  // Record the batch in the audit trail so directory pollution is traceable.
  if (imported > 0) {
    await logAudit({
      action: "create",
      resourceType: "directory_import",
      resourceId: region || "places",
      resourceTitle: `${imported} structure(s) importée(s)${region ? ` — ${region}` : ""}`,
      changes: {
        import: {
          old: null,
          new: { region: region ?? "", requested: placeIds.length, imported, skipped, placeIds },
        },
      },
    });
  }
  return { imported, skipped };
}

/**
 * Shared directory-import helpers, source-agnostic (Google Places or OSM).
 *
 * Both import backends produce the same `facilities` document shape and reuse the
 * same dedupe (by `placeId`), cap, and audit logging. Access control is enforced
 * by Firestore rules: only an admin may create `source:"imported"` pages.
 */
import {
  collection,
  doc,
  getDocs,
  limit,
  query as fsQuery,
  serverTimestamp,
  setDoc,
  where,
} from "@/services/db";
import { db } from "./firebase";
import { logAudit } from "./audit";
import { uniqueFacilitySlug } from "./facilities";
import type { FacilityCategory } from "@/lib/facilityTaxonomy";

export const FACILITIES = "facilities";

/** Health-structure types offered in the admin import UI, with their category. */
export const DIRECTORY_FACILITY_TYPES: { label: string; category: FacilityCategory }[] = [
  { label: "Hôpital", category: "hopital" },
  { label: "Centre de santé", category: "centre_sante" },
  { label: "Poste de santé", category: "poste_sante" },
  { label: "Clinique", category: "clinique" },
  { label: "Pharmacie", category: "pharmacie" },
  { label: "Cabinet médical", category: "cabinet" },
  { label: "Maternité", category: "maternite" },
];

/** UI label → category (for post-filtering OSM results / building Google query). */
export const categoryForTypeLabel = (label: string): FacilityCategory | undefined =>
  DIRECTORY_FACILITY_TYPES.find((t) => t.label === label)?.category;

/** Structured directory-search parameters (source-agnostic). */
export interface DirectorySearchParams {
  region: string;
  type?: string;
  keyword?: string;
}

/**
 * Hard cap on a single bulk import. Bounds how much an admin can inject into the
 * public directory in one action (quality control). Larger imports must be split
 * into batches so each is reviewed.
 */
export const IMPORT_CAP = 20;

export interface PlaceCandidate {
  /** Stable source id — Google `place_id`, or `osm/<type>/<id>` for OSM. */
  placeId: string;
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  rating: number | null;
  alreadyImported: boolean;
}

/** Normalised fields ready to persist as an unclaimed directory page. */
export interface ImportedFacilityInput {
  placeId: string;
  name: string;
  category: FacilityCategory;
  region: string;
  city: string;
  address: string;
  phone: string;
  hours: string;
  rating: number;
  coords: { lat: number; lng: number };
}

export function assertDb() {
  if (!db) throw new Error("Firebase non configuré.");
}

/** True if a facility with this source placeId already exists (dedupe). */
export async function alreadyImported(placeId: string): Promise<boolean> {
  const snap = await getDocs(
    fsQuery(collection(db!, FACILITIES), where("placeId", "==", placeId), limit(1)),
  );
  return !snap.empty;
}

/** Persist one normalised place as an unclaimed, published-but-unverified page. */
export async function writeImportedFacility(input: ImportedFacilityInput): Promise<void> {
  const slug = await uniqueFacilitySlug(input.name);
  await setDoc(doc(db!, FACILITIES, slug), {
    slug,
    // Imported listings are publicly visible (directory) but not yet "verified".
    published: true,
    verified: false,
    type: "",
    category: input.category,
    name: input.name,
    ownerUid: "",
    managerUids: [],
    region: input.region,
    city: input.city,
    address: input.address,
    phone: input.phone,
    email: "",
    cover: "",
    description: "",
    specialties: [],
    services: [],
    capacity: "",
    hours: input.hours,
    rating: input.rating,
    reviewsCount: 0,
    doctors: [],
    reviews: [],
    coords: input.coords,
    equipmentNeeds: [],
    source: "imported",
    placeId: input.placeId,
    claimStatus: "unclaimed",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Record the batch in the audit trail so directory pollution is traceable. */
export async function auditImport(
  region: string | undefined,
  requested: number,
  imported: number,
  skipped: number,
  placeIds: string[],
): Promise<void> {
  if (imported <= 0) return;
  await logAudit({
    action: "create",
    resourceType: "directory_import",
    resourceId: region || "places",
    resourceTitle: `${imported} structure(s) importée(s)${region ? ` — ${region}` : ""}`,
    changes: {
      import: {
        old: null,
        new: { region: region ?? "", requested, imported, skipped, placeIds },
      },
    },
  });
}

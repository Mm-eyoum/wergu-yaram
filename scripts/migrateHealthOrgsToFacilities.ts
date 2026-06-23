/**
 * One-off migration — unify health structures on the `facilities` model.
 *
 * Converts every `organizations` doc of type "healthcare_facility" into a
 * `facilities` doc (slug id), carries over ownership / status / monetization,
 * migrates its subscription doc (subscriptions/{orgId} → subscriptions/{slug}),
 * then deletes the organization. Partner / donor organizations are left intact.
 *
 * Uses the Admin SDK (bypasses security rules), same auth model as
 * scripts/seedContentAdmin.ts (Application Default Credentials):
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/serviceAccountKey.json
 *   # or: gcloud auth application-default login
 *
 * Usage:
 *   npx tsx scripts/migrateHealthOrgsToFacilities.ts            # DRY-RUN (default)
 *   npx tsx scripts/migrateHealthOrgsToFacilities.ts --apply    # perform writes
 *
 * Safe to re-run: an org whose slug already exists in `facilities` is skipped.
 * BACK UP Firestore before running with --apply.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { slugify } from "../src/lib/slug";

const APPLY = process.argv.includes("--apply");

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? process.env.VITE_FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

/** A facilities slug not already taken (checks Firestore + slugs assigned this run). */
async function uniqueSlug(name: string, taken: Set<string>): Promise<string> {
  const base = slugify(name) || "etablissement";
  let candidate = base;
  for (let n = 2; n <= 100; n++) {
    const inRun = taken.has(candidate);
    const inDb = inRun ? true : (await db.collection("facilities").doc(candidate).get()).exists;
    if (!inRun && !inDb) {
      taken.add(candidate);
      return candidate;
    }
    candidate = `${base}-${n}`;
  }
  const fallback = `${base}-${Date.now()}`;
  taken.add(fallback);
  return fallback;
}

function num(v: unknown, d = 0): number {
  return typeof v === "number" ? v : d;
}
function str(v: unknown, d = ""): string {
  return typeof v === "string" ? v : d;
}

async function main() {
  console.log(`\n=== Migration organizations(healthcare) → facilities ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ===\n`);
  const snap = await db.collection("organizations").where("type", "==", "healthcare_facility").get();
  console.log(`Trouvé ${snap.size} organization(s) de type healthcare_facility.\n`);

  const taken = new Set<string>();
  const mapping: { orgId: string; slug: string; subMigrated: boolean }[] = [];
  const skipped = 0;

  for (const docSnap of snap.docs) {
    const o = docSnap.data();
    const orgId = docSnap.id;
    const name = str(o.name, "Établissement de santé");
    const slug = await uniqueSlug(name, taken);

    const facility: Record<string, unknown> = {
      slug,
      published: o.status === "active",
      verified: Boolean(o.planTier),
      name,
      type: "",
      ...(o.category ? { category: o.category } : {}),
      ...(o.sector ? { sector: o.sector } : {}),
      region: str(o.region),
      city: str(o.city),
      address: str(o.address),
      phone: str(o.phone),
      email: "",
      cover: str(o.photoUrl) || "",
      description: str(o.description),
      specialties: [],
      services: [],
      capacity: "",
      hours: str(o.hours),
      rating: num(o.rating),
      reviewsCount: 0,
      doctors: [],
      reviews: [],
      coords: o.coords ?? { lat: 0, lng: 0 },
      equipmentNeeds: [],
      ownerUid: str(o.ownerUid),
      managerUids: Array.isArray(o.managerUids) ? o.managerUids : [],
      source: o.source ?? "user",
      claimStatus: o.claimStatus ?? "claimed",
      sourceOrgId: orgId,
      ...(o.placeId ? { placeId: o.placeId } : {}),
      ...(o.planTier ? { planTier: o.planTier } : {}),
      ...(o.planId ? { planId: o.planId } : {}),
      ...(o.featured ? { featured: o.featured } : {}),
      ...(o.subscribedUntil ? { subscribedUntil: o.subscribedUntil } : {}),
    };

    const subSnap = await db.collection("subscriptions").doc(orgId).get();
    const hasSub = subSnap.exists;

    console.log(`• ${name}\n    org ${orgId} → facilities/${slug}  (published=${facility.published}${hasSub ? ", + abonnement" : ""})`);

    if (APPLY) {
      await db.collection("facilities").doc(slug).set({
        ...facility,
        createdAt: o.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (hasSub) {
        const sub = subSnap.data()!;
        await db.collection("subscriptions").doc(slug).set(
          { ...sub, facilitySlug: slug, orgId: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
        await db.collection("subscriptions").doc(orgId).delete();
      }
      await db.collection("organizations").doc(orgId).delete();
    }
    mapping.push({ orgId, slug, subMigrated: hasSub });
  }

  console.log(`\n=== Résumé ===`);
  console.log(`Migré(s) : ${mapping.length}, ignoré(s) : ${skipped}`);
  console.table(mapping);
  if (!APPLY) console.log("\nDRY-RUN — aucune écriture. Relancez avec --apply pour appliquer.\n");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("Échec de la migration :", err);
    process.exit(1);
  },
);

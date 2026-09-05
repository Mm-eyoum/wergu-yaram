/**
 * One-off backfill — assign a `category` to existing imported directory
 * `organizations` that predate the taxonomy (they were all generic
 * `healthcare_facility`). Category is inferred from the structure name.
 *
 * Credentials: Application Default Credentials (no key file needed) —
 *   gcloud auth application-default login
 *   npm run backfill:categories
 *
 * Idempotent: skips docs that already carry a `category`.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { inferCategoryFromName } from "../src/lib/facilityTaxonomy";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();
const BATCH_LIMIT = 450;

async function main() {
  console.log("Backfill des catégories sur organizations (source: imported)\n");
  const snap = await db.collection("organizations").where("source", "==", "imported").get();

  const toUpdate = snap.docs.filter((d) => !d.data().category);
  console.log(`${snap.size} importées · ${toUpdate.length} sans catégorie`);

  let updated = 0;
  for (let i = 0; i < toUpdate.length; i += BATCH_LIMIT) {
    const slice = toUpdate.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const d of slice) {
      const category = inferCategoryFromName(d.data().name as string);
      batch.update(d.ref, { category });
      updated++;
    }
    await batch.commit();
  }

  console.log(`\n✅ ${updated} structure(s) catégorisée(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\n✖ Échec du backfill :", err?.message ?? err);
  process.exit(1);
});

/**
 * Seed the public catalog content into Firestore using the **Admin SDK**.
 *
 * Unlike `npm run seed` (client SDK, blocked by the admin-only content rules),
 * this bypasses security rules — the correct way to seed once the strict rules
 * are already deployed.
 *
 * Prerequisites:
 *   1. Install the Admin SDK (already in devDependencies): firebase-admin
 *   2. A service-account key (Console → Paramètres du projet → Comptes de service
 *      → Générer une nouvelle clé privée), then point to it:
 *        export GOOGLE_APPLICATION_CREDENTIALS=/chemin/serviceAccountKey.json
 *
 * Usage:
 *   npm run seed:admin
 *
 * Idempotent: document id = entity slug/id, so re-running overwrites.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { medications } from "../src/data/mockMedications";
import { pathologies } from "../src/data/mockPathologies";
import { articles } from "../src/data/mockArticles";
import { facilities } from "../src/data/mockFacilities";
import { communities } from "../src/data/mockCommunities";
import { equipmentNeeds } from "../src/data/mockEquipmentNeeds";
import { events } from "../src/data/mockEvents";
import { partners } from "../src/data/mockPartners";

// Admin SDK credentials come from Application Default Credentials, which resolve
// EITHER a service-account key (GOOGLE_APPLICATION_CREDENTIALS) OR a gcloud user
// login (`gcloud auth application-default login`). Both bypass security rules.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log(
    "ℹ GOOGLE_APPLICATION_CREDENTIALS non défini — utilisation des Application\n" +
      "  Default Credentials (gcloud auth application-default login).\n",
  );
}

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

// Firestore caps a batch at 500 operations; chunk below that so large
// collections (e.g. the 560-entry LME medications) don't blow the limit.
const BATCH_LIMIT = 450;

async function seedCollection<T extends Record<string, unknown>>(
  name: string,
  items: T[],
  idKey: keyof T,
) {
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const slice = items.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const item of slice) {
      batch.set(db.collection(name).doc(String(item[idKey])), item);
    }
    await batch.commit();
  }
  console.log(`✓ ${name}: ${items.length} documents`);
}

async function main() {
  console.log("Seed Firestore (Admin SDK) — contournement des règles\n");
  await seedCollection("medications", medications, "slug");
  await seedCollection("pathologies", pathologies, "slug");
  await seedCollection("articles", articles, "slug");
  await seedCollection("facilities", facilities, "slug");
  await seedCollection("communities", communities, "slug");
  await seedCollection("equipmentNeeds", equipmentNeeds, "id");
  await seedCollection("events", events, "id");
  await seedCollection("partners", partners, "slug");
  console.log("\n✅ Seed terminé.");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n✖ Échec du seed admin :", err?.message ?? err);
  process.exit(1);
});

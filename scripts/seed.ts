/**
 * Optional Firestore seed script — pushes the local mock content into Firestore
 * so the app can progressively switch from mock data to live data.
 *
 * Usage (config is read from .env.local — same VITE_FIREBASE_* keys):
 *
 *   node --env-file=.env.local --import tsx scripts/seed.ts
 *   # or:  npx -y tsx scripts/seed.ts   (after `export $(grep -v '^#' .env.local | xargs)`)
 *
 * Requires Firestore to be enabled and rules that allow the writes (run while
 * temporarily authenticated as an admin, or relax rules locally with the emulator).
 *
 * Note: this script is intentionally outside `src/` and excluded from the build.
 */
import { initializeApp } from "firebase/app";
import { doc, getFirestore, writeBatch } from "firebase/firestore";

import { medications } from "../src/data/mockMedications";
import { pathologies } from "../src/data/mockPathologies";
import { articles } from "../src/data/mockArticles";
import { facilities } from "../src/data/mockFacilities";
import { communities } from "../src/data/mockCommunities";
import { equipmentNeeds } from "../src/data/mockEquipmentNeeds";
import { events } from "../src/data/mockEvents";
import { partners } from "../src/data/mockPartners";

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function seedCollection<T extends Record<string, unknown>>(
  name: string,
  items: T[],
  idKey: keyof T,
) {
  const batch = writeBatch(db);
  for (const item of items) {
    batch.set(doc(db, name, String(item[idKey])), item);
  }
  await batch.commit();
  console.log(`✓ ${name}: ${items.length} documents`);
}

async function main() {
  await seedCollection("medications", medications, "slug");
  await seedCollection("pathologies", pathologies, "slug");
  await seedCollection("articles", articles, "slug");
  await seedCollection("facilities", facilities, "slug");
  await seedCollection("communities", communities, "slug");
  await seedCollection("equipmentNeeds", equipmentNeeds, "id");
  await seedCollection("events", events, "id");
  await seedCollection("partners", partners, "slug");
  console.log("\nSeed terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

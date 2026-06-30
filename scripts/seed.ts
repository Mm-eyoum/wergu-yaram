/**
 * Firestore seed — pushes the bundled catalog content into Firestore so the app
 * serves live data (services/catalog.ts reads Firestore, falling back to the
 * bundled mock only while a collection is empty).
 *
 * Run it with:
 *
 *   npm run seed
 *
 * which loads .env.local (VITE_FIREBASE_* keys) and executes this file via tsx.
 *
 * Auth & security rules:
 *   The content collections are admin-only for writes (firestore.rules). Two
 *   supported ways to seed:
 *
 *   1. BEFORE deploying the strict rules — create the Firestore database in
 *      "test mode" (open for 30 days), run `npm run seed`, THEN
 *      `npm run deploy:rules`. No credentials needed.
 *
 *   2. AFTER rules are live — provide an admin account in .env.local:
 *        SEED_ADMIN_EMAIL=...        # account whose users/{uid}.role is admin|super_admin
 *        SEED_ADMIN_PASSWORD=...
 *      The script signs in first so the writes satisfy isAdmin().
 *
 * Idempotent: documents use the entity slug/id as id, so re-running overwrites.
 */
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getFirestore, writeBatch } from "firebase/firestore";

import { medications } from "../src/data/mockMedications";
import { pathologies } from "../src/data/mockPathologies";
import { articles } from "../src/data/mockArticles";
import { facilities } from "../src/data/mockFacilities";
import { communities } from "../src/data/mockCommunities";
import { equipmentNeeds } from "../src/data/mockEquipmentNeeds";
import { events } from "../src/data/mockEvents";
import { partners } from "../src/data/mockPartners";
import { formations } from "../src/data/mockFormations";
import { tenants } from "../src/data/mockTenants";
import { pricingPlans } from "../src/data/pricingPlans";

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  console.error("✖ Config Firebase manquante. Vérifiez .env.local (VITE_FIREBASE_*).");
  process.exit(1);
}

const app = initializeApp(config);
const db = getFirestore(app);

async function maybeSignIn() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("ℹ Aucun SEED_ADMIN_EMAIL fourni — écriture non authentifiée");
    console.log("  (OK uniquement si la base est en « test mode » ou avant le déploiement des règles).\n");
    return;
  }
  await signInWithEmailAndPassword(getAuth(app), email, password);
  console.log(`✓ Authentifié en tant qu'admin : ${email}\n`);
}

// Firestore caps a WriteBatch at 500 operations; chunk below that so large
// collections (e.g. the 560-entry LME medications) don't blow the limit.
const BATCH_LIMIT = 450;

async function seedCollection<T extends Record<string, unknown>>(
  name: string,
  items: T[],
  idKey: keyof T,
) {
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const slice = items.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const item of slice) {
      batch.set(doc(db, name, String(item[idKey])), item);
    }
    await batch.commit();
  }
  console.log(`✓ ${name}: ${items.length} documents`);
}

async function main() {
  console.log(`Seed Firestore → projet ${config.projectId}\n`);
  await maybeSignIn();

  await seedCollection("medications", medications, "slug");
  await seedCollection("pathologies", pathologies, "slug");
  await seedCollection("articles", articles, "slug");
  await seedCollection("facilities", facilities, "slug");
  await seedCollection("communities", communities, "slug");
  await seedCollection("equipmentNeeds", equipmentNeeds, "id");
  await seedCollection("events", events, "id");
  await seedCollection("partners", partners, "slug");
  await seedCollection("formations", formations, "slug");
  await seedCollection("tenants", tenants, "slug");
  await seedCollection("pricingPlans", pricingPlans, "id");

  console.log("\n✅ Seed terminé.");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n✖ Échec du seed :", err?.message ?? err);
  if (String(err?.code).includes("permission-denied")) {
    console.error(
      "  → Les règles bloquent l'écriture. Seedez en « test mode » avant deploy:rules,\n" +
        "    ou définissez SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (compte admin).",
    );
  }
  process.exit(1);
});

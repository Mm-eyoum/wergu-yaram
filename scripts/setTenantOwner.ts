/**
 * Assign an owner (and add them as manager) to a partner space (tenant).
 *
 *   node --env-file=.env.local --import tsx scripts/setTenantOwner.ts <slug> <email>
 *
 * Resolves the Firebase Auth user by email and sets tenants/<slug>.ownerUid
 * (+ managerUids). Admin SDK / ADC, same auth as the other scripts:
 *   GOOGLE_APPLICATION_CREDENTIALS + GOOGLE_CLOUD_PROJECT in .env.local.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [slug, email] = process.argv.slice(2);
if (!slug || !email) {
  console.error("Usage: tsx scripts/setTenantOwner.ts <slug> <email>");
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? process.env.VITE_FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

async function main() {
  // Resolve uid from the `users` collection (doc id = uid), via Firestore (ADC) —
  // avoids the Admin Auth API which needs extra project permissions.
  const found = await db.collection("users").where("email", "==", email).limit(1).get();
  if (found.empty) throw new Error(`Aucun compte 'users' avec l'email ${email} (le compte doit être inscrit).`);
  const uid = found.docs[0].id;

  const ref = db.collection("tenants").doc(slug);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`tenants/${slug} introuvable.`);

  await ref.set(
    {
      ownerUid: uid,
      managerUids: FieldValue.arrayUnion(uid),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  console.log(`✓ tenants/${slug} → ownerUid = ${uid} (${email})`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("✖ Échec :", err?.message ?? err);
    process.exit(1);
  },
);

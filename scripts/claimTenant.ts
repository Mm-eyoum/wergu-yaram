/**
 * Set the owner/manager of a partner space (tenant), via the CLIENT SDK signed
 * in as SEED_ADMIN_EMAIL/PASSWORD (same path as scripts/seed.ts). That account
 * must be an editor/admin (the tenant write needs isEditor()).
 *
 *   node --env-file=.env.local --import tsx scripts/claimTenant.ts <slug> [targetUid]
 *
 * - With [targetUid]: sets tenants/<slug>.ownerUid = targetUid (e.g. a partner's
 *   uid) — the signed-in admin grants ownership to that account.
 * - Without: sets ownerUid to the signed-in uid (self-claim).
 */
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, getFirestore, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";

const slug = process.argv[2];
const targetUid = process.argv[3];
if (!slug) {
  console.error("Usage: tsx scripts/claimTenant.ts <slug> [targetUid]");
  process.exit(1);
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD requis dans .env.local.");
  const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
  const uid = cred.user.uid;

  // Diagnostic: confirm this account's role (isEditor needed to write tenants).
  const me = await getDoc(doc(db, "users", uid));
  console.log(`uid=${uid} · profil users existe=${me.exists()} · role=${me.data()?.role ?? "(aucun)"}`);

  const owner = targetUid || uid;
  const ref = doc(db, "tenants", slug);
  if (!(await getDoc(ref)).exists()) throw new Error(`tenants/${slug} introuvable.`);
  await updateDoc(ref, { ownerUid: owner, managerUids: arrayUnion(owner), updatedAt: serverTimestamp() });
  console.log(`✓ tenants/${slug} → ownerUid = ${owner} (signé par ${email})`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("✖ Échec :", err?.message ?? err);
    process.exit(1);
  },
);

/**
 * Set an impact-API key on a tenant (client SDK, signed in as SEED_ADMIN editor).
 *   node --env-file=.env.local --import tsx scripts/setTenantApiKey.ts <slug> [key]
 * Prints the key. If [key] omitted, generates one.
 */
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, getFirestore, serverTimestamp, updateDoc } from "firebase/firestore";

const slug = process.argv[2];
let key = process.argv[3];
if (!slug) {
  console.error("Usage: tsx scripts/setTenantApiKey.ts <slug> [key]");
  process.exit(1);
}
if (!key) key = "wy_" + Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD requis.");
  await signInWithEmailAndPassword(getAuth(app), email, password);
  const ref = doc(db, "tenants", slug);
  if (!(await getDoc(ref)).exists()) throw new Error(`tenants/${slug} introuvable.`);
  await updateDoc(ref, { apiKey: key, updatedAt: serverTimestamp() });
  console.log(`✓ tenants/${slug}.apiKey = ${key}`);
}

main().then(
  () => process.exit(0),
  (err) => { console.error("✖ Échec :", err?.message ?? err); process.exit(1); },
);

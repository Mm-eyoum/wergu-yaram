/**
 * Provision the first elevated account (super_admin) for Wergu Yaram.
 *
 * This is the ONLY way to bootstrap an elevated role: Firestore rules forbid a
 * client from granting `admin`/`super_admin`, so it must be done with the
 * Admin SDK (which bypasses rules).
 *
 * Prerequisites:
 *   1. The target user must already have signed up (so a Firebase Auth account
 *      and a `users/{uid}` profile exist). Pass the email as an argument or via
 *      the SEED_ADMIN_EMAIL env var — there is no hardcoded default.
 *   2. Install the Admin SDK:   npm i -D firebase-admin
 *   3. A service-account key with Firestore + Auth admin access:
 *      export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=someone@example.com npx -y tsx scripts/seedAdmin.ts
 *   npx -y tsx scripts/seedAdmin.ts someone@example.com super_admin
 *
 * Safe to re-run (idempotent): it only sets the role field.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Target email resolves from (1) CLI arg, (2) SEED_ADMIN_EMAIL env var. There is
// no hardcoded default so the script can't silently promote a fixed account if
// run elsewhere — it requires an explicit target.
const ALLOWED_ROLES = ["admin", "super_admin"] as const;
type ElevatedRole = (typeof ALLOWED_ROLES)[number];

const email = process.argv[2] ?? process.env.SEED_ADMIN_EMAIL;
if (!email) {
  console.error(
    "Email cible requis. Fournissez-le en argument ou via SEED_ADMIN_EMAIL.\n" +
      "  ex: npx -y tsx scripts/seedAdmin.ts admin@example.com super_admin",
  );
  process.exit(1);
}
const role = (process.argv[3] ?? "super_admin") as ElevatedRole;

if (!ALLOWED_ROLES.includes(role)) {
  console.error(`Role invalide: ${role}. Utilisez: ${ALLOWED_ROLES.join(" | ")}`);
  process.exit(1);
}

// Resolve the project explicitly: applicationDefault() does not always infer it
// from user ADC, which silently points the Admin SDK at the wrong project.
const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? "werguyaram";

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId });
}

const auth = getAuth();
const db = getFirestore();

async function main() {
  const userRecord = await auth.getUserByEmail(email).catch((err) => {
    // Only "user not found" means the account is missing; surface everything
    // else (permission/quota/network) instead of disguising it as "no account".
    if (err?.code === "auth/user-not-found") return null;
    throw err;
  });
  if (!userRecord) {
    console.error(
      `Aucun compte Firebase Auth pour ${email}. ` +
        `L'utilisateur doit d'abord s'inscrire dans l'application.`,
    );
    process.exit(1);
  }

  const uid = userRecord.uid;
  // Set the Firestore role (read by the app + rules) …
  await db.doc(`users/${uid}`).set({ role, status: "active" }, { merge: true });
  // … and a matching custom claim (handy for any future server-side checks).
  await auth.setCustomUserClaims(uid, { role });

  console.log(`✓ ${email} (uid=${uid}) est désormais ${role}.`);
  console.log("  L'utilisateur doit se reconnecter pour rafraîchir son token.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

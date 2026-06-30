/**
 * One-off migration — fold the standalone `committees` collection into each
 * tenant document as `tenant.committee` (governance + impact indicators).
 *
 * For each `committees` doc with a `tenantSlug`:
 *   - write `tenants/{tenantSlug}.committee = { name, mission, members, indicators }`
 *     (only when the tenant doc exists);
 *   - then delete the committee doc.
 * Committees without a (valid) tenantSlug are reported and LEFT in place.
 *
 * Uses the Admin SDK (bypasses rules), same auth as the other scripts (ADC):
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json
 *   export GOOGLE_CLOUD_PROJECT=werguyaram   # or VITE_FIREBASE_PROJECT_ID
 *
 * Usage:
 *   npx tsx scripts/migrateCommitteesIntoTenants.ts            # DRY-RUN (default)
 *   npx tsx scripts/migrateCommitteesIntoTenants.ts --apply    # perform writes
 *
 * Idempotent: a committee whose tenant already carries an identical `committee`
 * is reported as "skip" (still deleted on --apply). BACK UP Firestore first.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? process.env.VITE_FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

type Member = { name?: string; role?: string; org?: string };
type Indicator = { label?: string; value?: string };

function pickCommittee(data: Record<string, unknown>) {
  return {
    name: typeof data.name === "string" ? data.name : "",
    mission: typeof data.mission === "string" ? data.mission : "",
    members: Array.isArray(data.members) ? (data.members as Member[]) : [],
    indicators: Array.isArray(data.indicators) ? (data.indicators as Indicator[]) : [],
  };
}

async function main() {
  console.log(`\n${APPLY ? "APPLYING" : "DRY-RUN"} — committees → tenants.committee\n`);
  const snap = await db.collection("committees").get();
  console.log(`${snap.size} committee doc(s) found.\n`);

  let migrated = 0,
    skipped = 0,
    orphan = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const tenantSlug = typeof data.tenantSlug === "string" ? data.tenantSlug : "";
    if (!tenantSlug) {
      console.log(`  ⚠ committees/${doc.id} — no tenantSlug, LEFT in place`);
      orphan++;
      continue;
    }
    const tenantRef = db.collection("tenants").doc(tenantSlug);
    const tenantSnap = await tenantRef.get();
    if (!tenantSnap.exists) {
      console.log(`  ⚠ committees/${doc.id} → tenants/${tenantSlug} MISSING, LEFT in place`);
      orphan++;
      continue;
    }
    const committee = pickCommittee(data);
    const existing = JSON.stringify((tenantSnap.data() as { committee?: unknown }).committee ?? null);
    const next = JSON.stringify(committee);
    const action = existing === next ? "skip (identical)" : "migrate";
    if (action.startsWith("skip")) skipped++;
    else migrated++;
    console.log(`  • committees/${doc.id} → tenants/${tenantSlug}.committee [${action}]`);

    if (APPLY) {
      if (action === "migrate") {
        await tenantRef.set(
          { committee, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
      }
      await doc.ref.delete();
      console.log(`    ✓ written + committees/${doc.id} deleted`);
    }
  }

  console.log(
    `\nDone. migrate=${migrated} skip=${skipped} orphan=${orphan}` +
      (APPLY ? "" : "  (dry-run — re-run with --apply to write)"),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

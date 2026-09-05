/**
 * One-off migration — tag tenant content with ownership for the partner
 * sub-platform model.
 *
 * For each `tenants` doc:
 *   - derive `ownerUid` from `partnerOrgId`'s organization owner (if any & unset);
 *   - stamp every doc referenced by the curated lists with `tenantSlug` (+ `ownerUid`):
 *       communitySlugs → communities/{slug}
 *       eventIds       → events/{id}
 *       articleSlugs   → articles/{slug}
 *     and set `ownerUid` on committees already carrying this tenantSlug.
 * The curated arrays are LEFT in place (they become a "featured/ordering" hint).
 *
 * Uses the Admin SDK (bypasses rules), same auth as the other scripts (ADC):
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json
 *   export GOOGLE_CLOUD_PROJECT=werguyaram   # or VITE_FIREBASE_PROJECT_ID
 *
 * Usage:
 *   npx tsx scripts/migrateTenantOwnership.ts            # DRY-RUN (default)
 *   npx tsx scripts/migrateTenantOwnership.ts --apply    # perform writes
 *
 * Idempotent: a doc already carrying the same tenantSlug is skipped.
 * BACK UP Firestore before running with --apply.
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

function str(v: unknown, d = ""): string {
  return typeof v === "string" ? v : d;
}

/** Tag one referenced doc with tenantSlug (+ ownerUid). Returns "tagged" | "skip" | "missing". */
async function tagDoc(
  collection: string,
  id: string,
  tenantSlug: string,
  ownerUid: string,
): Promise<"tagged" | "skip" | "missing"> {
  const ref = db.collection(collection).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return "missing";
  const data = snap.data() as { tenantSlug?: string; ownerUid?: string };
  if (data.tenantSlug === tenantSlug && (!ownerUid || data.ownerUid === ownerUid)) return "skip";
  if (APPLY) {
    await ref.set(
      {
        tenantSlug,
        ...(ownerUid ? { ownerUid } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  return "tagged";
}

async function main() {
  console.log(`\n=== Migration tenant ownership ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ===\n`);
  const tenants = await db.collection("tenants").get();
  console.log(`Trouvé ${tenants.size} espace(s) partenaire.\n`);

  let tagged = 0;
  let skipped = 0;
  let missing = 0;

  for (const t of tenants.docs) {
    const tenant = t.data() as {
      ownerUid?: string;
      partnerOrgId?: string;
      communitySlugs?: string[];
      eventIds?: string[];
      articleSlugs?: string[];
    };
    const slug = t.id;

    // Derive ownerUid from the linked organization owner, if not already set.
    let ownerUid = str(tenant.ownerUid);
    if (!ownerUid && tenant.partnerOrgId) {
      const org = await db.collection("organizations").doc(tenant.partnerOrgId).get();
      ownerUid = str(org.data()?.ownerUid);
      if (ownerUid) {
        console.log(`• ${slug}: ownerUid dérivé de l'organisation ${tenant.partnerOrgId} → ${ownerUid}`);
        if (APPLY) await t.ref.set({ ownerUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }

    const targets: [string, string[]][] = [
      ["communities", tenant.communitySlugs ?? []],
      ["events", tenant.eventIds ?? []],
      ["articles", tenant.articleSlugs ?? []],
    ];
    for (const [collection, ids] of targets) {
      for (const id of ids) {
        const r = await tagDoc(collection, id, slug, ownerUid);
        if (r === "tagged") tagged++;
        else if (r === "skip") skipped++;
        else missing++;
        console.log(`    ${collection}/${id} → ${r}`);
      }
    }

    // Committees already carry tenantSlug; just backfill ownerUid.
    if (ownerUid) {
      const committees = await db.collection("committees").where("tenantSlug", "==", slug).get();
      for (const c of committees.docs) {
        if (c.data().ownerUid === ownerUid) {
          skipped++;
        } else {
          tagged++;
          if (APPLY) await c.ref.set({ ownerUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          console.log(`    committees/${c.id} → ownerUid`);
        }
      }
    }
  }

  console.log(`\n=== Résumé ===`);
  console.log(`Tagué(s) : ${tagged}, ignoré(s) : ${skipped}, introuvable(s) : ${missing}`);
  if (!APPLY) console.log("\nDRY-RUN — aucune écriture. Relancez avec --apply pour appliquer.\n");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("Échec de la migration :", err);
    process.exit(1);
  },
);

/**
 * One-off: liste tous les partenaires existants en prod (Admin SDK via ADC).
 *   node --env-file=.env.local --import tsx scripts/listPartners.ts
 * Sources : `partners` (catalogue), `organizations` (type partner/partner_donor),
 * `tenants` (espaces partenaires).
 */
import { getDb } from "./lib/firestoreCatalog";

const db = getDb();
if (!db) {
  console.error("✗ GOOGLE_APPLICATION_CREDENTIALS absent — ADC requis.");
  process.exit(1);
}

const pub = (d: Record<string, unknown>) => d.published !== false;

const [partnersSnap, orgsSnap, tenantsSnap] = await Promise.all([
  db.collection("partners").get(),
  db.collection("organizations").get(),
  db.collection("tenants").get(),
]);

const partners = partnersSnap.docs.map((d) => d.data());
console.log(`\n=== partners (catalogue éditorial) — ${partners.length} doc(s) ===`);
for (const p of partners) {
  console.log(`  • ${p.name}  [${p.slug}]  cat=${p.category}  publié=${p.published !== false}${p.featured ? "  ★à la une" : ""}`);
}

const orgPartners = orgsSnap.docs
  .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
  .filter((o) => o.type === "partner" || o.type === "partner_donor");
console.log(`\n=== organizations type partner/donor — ${orgPartners.length} doc(s) ===`);
for (const o of orgPartners) {
  console.log(`  • ${o.name}  [${o.id}]  type=${o.type}  status=${o.status}  claim=${o.claimStatus ?? "-"}`);
}

const tenants = tenantsSnap.docs.map((d) => d.data());
console.log(`\n=== tenants (espaces partenaires) — ${tenants.length} doc(s) ===`);
for (const t of tenants) {
  const onPage = t.showOnPartnersPage !== false;
  console.log(`  • ${t.name}  [${t.slug}]  publié=${pub(t)}  surPagePartenaires=${onPage}  owner=${t.ownerUid ?? "-"}`);
}

const visibleOnPublic =
  partners.filter(pub).length +
  orgPartners.filter((o) => o.status === "active").length +
  tenants.filter((t) => pub(t) && t.showOnPartnersPage !== false).length;
console.log(
  `\nTotal docs: ${partners.length + orgPartners.length + tenants.length} — ` +
    `dont ~${visibleOnPublic} actuellement visibles sur /partenaires\n`,
);
process.exit(0);

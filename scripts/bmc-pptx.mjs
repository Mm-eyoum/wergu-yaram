/**
 * Génère le Business Model Canvas de Wergu Yaram en PowerPoint (.pptx).
 *
 *   node scripts/bmc-pptx.mjs
 *
 * Utilise pptxgenjs (écrit le fichier directement, aucun service externe).
 * Sortie : docs/business-model-canvas.pptx
 */
import pptxgen from "pptxgenjs";
import { mkdirSync } from "node:fs";
import { existsSync } from "node:fs";

mkdirSync("docs", { recursive: true });

/* Charte (hex sans #) */
const GREEN = "007A5E";
const GREENL = "00A878";
const TEAL = "00B894";
const NAVY = "0B1F49";
const MINT = "EEFDF8";
const SOFT = "F7FBFA";
const BORDER = "E6EEF2";
const TEXT2 = "667085";
const WHITE = "FFFFFF";

const LOGO = existsSync("public/logo.png") ? "public/logo.png" : null;

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pptx.author = "Wergu Yaram";
pptx.company = "Wergu Yaram";
pptx.subject = "Business Model Canvas";
pptx.title = "Wergu Yaram — Business Model Canvas";

const W = 13.333;

/* ---- BMC content ---- */
const BMC = {
  partners: ["Bictorys — mobile money (Wave, Orange Money, MTN, carte)", "ASSAD & partenaires communautaires / associatifs (pilotes)", "Structures de santé & ordres professionnels", "ONG, fondations, institutions & bailleurs", "Partenaires académiques & de formation", "Google Places / OSM · Chatwoot / Brevo · Firebase"],
  activities: ["Production & curation de contenu vérifié", "Développement & exploitation de la plateforme", "Modération & animation de la communauté", "Onboarding & animation des espaces partenaires", "Campagnes de prévention ciblées (SMS / WhatsApp)", "Mesure d'impact & reporting ESG", "Acquisition / SEO / growth · vente B2B · paiements"],
  resources: ["Référentiel santé vérifié (UEMOA/LME) — moat de contenu", "Plateforme tech (React + Firebase serverless, Typesense)", "Socle multi-tenant + Comités (gouvernance d'impact)", "Annuaire des structures + catalogue de formations (réseau)", "Audience & communauté engagée · marque de confiance", "Mobile money (Bictorys) + omnicanal (Chatwoot)"],
  value: ["Information santé vérifiée & gratuite (DCI/UEMOA, pathologies)", "Annuaire géolocalisé + pages crédibles (Vérifié / Pro)", "Espaces partenaires en marque blanche (Kit Digital)", "Campagnes de prévention SMS/WhatsApp ciblées (consenties)", "Tableaux de bord d'impact + reporting ESG (Comités)", "Collecte de fonds traçable + billetterie d'événements", "Communauté & annuaire de professionnels vérifiés · formations"],
  relationships: ["Self-service (comptes, pages, tableau de bord)", "Espace partenaire dédié + Comité de pilotage", "Reconnaissance des donateurs (« Mes dons & impact »)", "Communauté & forum modérés", "Support omnicanal (Chatwoot + messagerie in-app)", "Abonnements (relation récurrente structures & partenaires)"],
  channels: ["Web / PWA — SEO du référentiel = moteur d'acquisition", "Sous-domaines partenaires (<marque>.werguyaram.org)", "Campagnes SMS / WhatsApp (Chatwoot)", "Recherche fédérée (Typesense)", "Réseaux sociaux · communautés WhatsApp / églises", "Newsletter / email · bouche-à-oreille & parrainage"],
  segments: ["Grand public : patients & aidants", "Donateurs (locaux + récurrents)", "Structures de santé (hôpitaux, cliniques, CSPS)", "Partenaires communautaires & associatifs (ASSAD)", "Institutions & bailleurs (impact / ESG)", "Académiques & formation · soignants vérifiés · organisateurs"],
  costs: ["Infrastructure cloud (coût marginal faible)", "Frais agrégateur mobile money (~1,2 %)", "Coûts SMS / WhatsApp (templates Meta, agrégateur)", "Provisioning DNS / SSL multi-tenant", "Production éditoriale & modération · acquisition", "Équipe & exploitation · conformité (TVA, CDP)"],
  revenue: ["Dons + pourboire plateforme optionnel (+ dons récurrents)", "Abonnements pages : Vérifié 9 900 / Pro 24 900 XOF / mois (−20 % annuel)", "Espaces partenaires (Kit Digital) : ~49–99 k XOF/mois + Pacte-Convention annuel sur devis", "Commission billetterie (8–10 %)", "Sponsoring de rubriques (150 k–400 k XOF / mois)", "Data / B2B & rapports d'impact (devis 500 k+ XOF)"],
};

/* ---- helpers ---- */
function footer(slide, n) {
  slide.addText("Wergu Yaram — Business Model Canvas", { x: 0.4, y: 7.05, w: 8, h: 0.3, fontSize: 8, color: TEXT2 });
  if (n) slide.addText(String(n), { x: 12.4, y: 7.05, w: 0.5, h: 0.3, fontSize: 8, color: TEXT2, align: "right" });
}
function bullets(items) {
  return items.map((t) => ({ text: t, options: { bullet: { code: "2022", indent: 12 }, breakLine: true } }));
}
/** A titled content slide with a green header rule. */
function contentSlide(title, kicker) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  if (kicker) slide.addText(kicker.toUpperCase(), { x: 0.5, y: 0.45, w: 12, h: 0.3, fontSize: 11, color: GREEN, bold: true, charSpacing: 2 });
  slide.addText(title, { x: 0.5, y: 0.7, w: 12.3, h: 0.7, fontSize: 26, bold: true, color: NAVY });
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.45, w: 0.7, h: 0.06, fill: { color: GREEN } });
  return slide;
}

/* =========================================================
   1 — TITLE
========================================================= */
{
  const s = pptx.addSlide();
  s.background = { color: GREEN };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 3.0, fill: { color: GREENL } });
  if (LOGO) {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 0.85, w: 0.95, h: 0.95, fill: { color: WHITE }, rectRadius: 0.12 });
    s.addImage({ path: LOGO, x: 1.0, y: 0.95, w: 0.75, h: 0.75 });
  }
  s.addText("Wergu Yaram", { x: 2.0, y: 0.95, w: 8, h: 0.7, fontSize: 26, bold: true, color: WHITE });
  s.addText("BUSINESS MODEL CANVAS", { x: 0.95, y: 3.0, w: 11, h: 0.5, fontSize: 16, bold: true, color: "D6FBEF", charSpacing: 3 });
  s.addText("Le modèle économique de la plateforme", { x: 0.9, y: 3.5, w: 11.5, h: 1.2, fontSize: 44, bold: true, color: WHITE });
  s.addText("Plateforme santé, communauté & solidarité — Sénégal · XOF", { x: 0.95, y: 4.9, w: 11, h: 0.5, fontSize: 18, color: "EAFff8" });
}

/* =========================================================
   2 — SNAPSHOT
========================================================= */
{
  const s = contentSlide("En bref", "Snapshot");
  const cards = [
    { t: "Quoi", b: "Portail santé vérifié + annuaire des structures + collecte de fonds & événements, pour l'Afrique de l'Ouest." },
    { t: "Pour qui", b: "Grand public, donateurs, structures de santé, ONG/partenaires, organisateurs, soignants." },
    { t: "Comment on gagne", b: "Pourboire sur dons, abonnements de pages (MRR), espaces partenaires (Kit Digital), commission billetterie, sponsoring, data B2B." },
  ];
  cards.forEach((c, i) => {
    const x = 0.5 + i * 4.15;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 2.0, w: 3.9, h: 3.6, fill: { color: SOFT }, line: { color: BORDER, width: 1 }, rectRadius: 0.08 });
    s.addShape(pptx.ShapeType.rect, { x, y: 2.0, w: 3.9, h: 0.08, fill: { color: GREEN } });
    s.addText(c.t, { x: x + 0.25, y: 2.25, w: 3.4, h: 0.5, fontSize: 16, bold: true, color: NAVY });
    s.addText(c.b, { x: x + 0.25, y: 2.85, w: 3.4, h: 2.5, fontSize: 13, color: TEXT2, valign: "top" });
  });
  footer(s, 2);
}

/* =========================================================
   3 — THE CANVAS (9 blocks, classic layout)
========================================================= */
{
  const s = contentSlide("Business Model Canvas", "Vue d'ensemble");
  const X = 0.4, top = 1.75, colW = 2.52, gap = 0.06;
  const topH = 4.0, halfH = (topH - gap) / 2, botY = top + topH + gap, botH = 1.0;
  const col = (i) => X + i * (colW + gap);

  const block = (x, y, w, h, title, items, accent, fill = WHITE) => {
    s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: fill }, line: { color: BORDER, width: 1 } });
    s.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.05, fill: { color: accent } });
    s.addText(title.toUpperCase(), { x: x + 0.1, y: y + 0.08, w: w - 0.2, h: 0.3, fontSize: 8.5, bold: true, color: NAVY, charSpacing: 1 });
    s.addText(bullets(items), { x: x + 0.1, y: y + 0.42, w: w - 0.2, h: h - 0.5, fontSize: 7, color: TEXT2, valign: "top", lineSpacingMultiple: 0.95 });
  };

  block(col(0), top, colW, topH, "Partenaires clés", BMC.partners, NAVY);
  block(col(1), top, colW, halfH, "Activités clés", BMC.activities, TEAL);
  block(col(1), top + halfH + gap, colW, halfH, "Ressources clés", BMC.resources, TEAL);
  block(col(2), top, colW, topH, "Propositions de valeur", BMC.value, GREEN, MINT);
  block(col(3), top, colW, halfH, "Relations clients", BMC.relationships, TEAL);
  block(col(3), top + halfH + gap, colW, halfH, "Canaux", BMC.channels, TEAL);
  block(col(4), top, colW, topH, "Segments de clientèle", BMC.segments, NAVY);
  // bottom row
  const fullW = 5 * colW + 4 * gap;
  block(X, botY, (fullW - gap) / 2, botH, "Structure de coûts", BMC.costs.slice(0, 3), TEXT2);
  block(X + (fullW - gap) / 2 + gap, botY, (fullW - gap) / 2, botH, "Sources de revenus", BMC.revenue.slice(0, 3), GREEN, MINT);
  footer(s, 3);
}

/* =========================================================
   4–12 — ONE SLIDE PER BLOCK
========================================================= */
const blocks = [
  ["Partenaires clés", BMC.partners, NAVY],
  ["Activités clés", BMC.activities, TEAL],
  ["Ressources clés", BMC.resources, TEAL],
  ["Propositions de valeur", BMC.value, GREEN],
  ["Relations clients", BMC.relationships, TEAL],
  ["Canaux", BMC.channels, TEAL],
  ["Segments de clientèle", BMC.segments, NAVY],
  ["Structure de coûts", BMC.costs, TEXT2],
  ["Sources de revenus", BMC.revenue, GREEN],
];
blocks.forEach(([title, items, accent], i) => {
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  // left accent panel
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 4.3, h: 7.5, fill: { color: accent } });
  s.addText(`${String(i + 1).padStart(2, "0")}`, { x: 0.5, y: 0.6, w: 3, h: 1, fontSize: 40, bold: true, color: "FFFFFF", transparency: 30 });
  s.addText(title, { x: 0.5, y: 2.6, w: 3.4, h: 2, fontSize: 28, bold: true, color: WHITE, valign: "top" });
  s.addText("Business Model Canvas", { x: 0.5, y: 6.7, w: 3.4, h: 0.4, fontSize: 10, color: "FFFFFF" });
  // right bullets
  s.addText(bullets(items), { x: 4.9, y: 1.0, w: 8, h: 5.5, fontSize: 16, color: NAVY, valign: "top", lineSpacingMultiple: 1.1, paraSpaceAfter: 10 });
  footer(s, 4 + i);
});

/* =========================================================
   13 — REVENUE & UNIT ECONOMICS
========================================================= */
{
  const s = contentSlide("Sources de revenus & unit economics", "Modèle financier — XOF");
  const head = ["Ligne", "Modèle", "Entrée", "Premium", "LTV/CAC", "Marge"].map((t) => ({
    text: t, options: { bold: true, color: WHITE, fill: { color: GREEN }, fontSize: 11, align: "left" },
  }));
  const rows = [
    ["Dons", "Don + pourboire", "500 XOF", "5 000/mois (récurrent)", "10×–∞", "~94 %*"],
    ["Pages structures", "Abonnement", "Gratuit", "9 900 → 24 900/mois", "~22×", "~88 %"],
    ["Espaces partenaires (Kit)", "Hybride abo + convention", "~49 k/mois", "Convention (devis)", "élevé", "~88 %"],
    ["Billetterie", "One-time + commission", "Gratuit", "2 500–15 000/billet", "élevé", "~90 %"],
    ["Sponsoring", "Rubrique sponsorisée", "—", "150 k–400 k/mois", "—", "~95 %"],
    ["Data / B2B", "Licence / devis", "—", "500 k+", "—", "~85 %"],
  ].map((r) => r.map((c) => ({ text: c, options: { fontSize: 11, color: NAVY } })));
  s.addTable([head, ...rows], {
    x: 0.5, y: 1.8, w: 12.3, colW: [2.2, 2.6, 1.6, 3.1, 1.4, 1.4],
    border: { type: "solid", color: BORDER, pt: 1 }, rowH: 0.5, valign: "middle", align: "left",
    fill: { color: SOFT },
  });
  s.addText("* Marge plateforme sur dons = pourboire/frais perçus − frais agrégateur ; le don est intégralement reversé à la structure.", { x: 0.5, y: 5.45, w: 12.3, h: 0.4, fontSize: 10, italic: true, color: TEXT2 });
  s.addText([
    { text: "Objectif An 1 : ", options: { bold: true, color: GREEN } },
    { text: "3–12 M XOF · ~50–150 structures payantes + espaces partenaires (MRR B2B) · marges 85–95 %.", options: { color: NAVY } },
  ], { x: 0.5, y: 5.95, w: 12.3, h: 0.6, fontSize: 13, fill: { color: MINT }, align: "left" });
  footer(s, 13);
}

/* =========================================================
   14 — ROADMAP
========================================================= */
{
  const s = contentSlide("Roadmap 12 mois", "Exécution");
  const phases = [
    ["M1–M3 · Fondations", "Activer dons (Bictorys) + pourboire ; migration données ; KPIs.", "0,1–0,6 M"],
    ["M4–M6 · Accélération", "Abonnements pages + espaces partenaires (Kit Digital) ; dons récurrents.", "0,8–3 M"],
    ["M7–M9 · Expansion", "Billetterie ; cross-sell ; dashboard revenus.", "2–6 M"],
    ["M10–M12 · Optimisation", "Pricing/funnel ; reporting auto ; 1ᵉʳ deal data B2B.", "3–12 M"],
  ];
  phases.forEach((p, i) => {
    const y = 1.9 + i * 1.25;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 12.3, h: 1.05, fill: { color: i % 2 ? WHITE : SOFT }, line: { color: BORDER, width: 1 }, rectRadius: 0.06 });
    s.addShape(pptx.ShapeType.rect, { x: 0.5, y, w: 0.12, h: 1.05, fill: { color: GREEN } });
    s.addText(p[0], { x: 0.8, y: y + 0.12, w: 3.5, h: 0.8, fontSize: 15, bold: true, color: NAVY, valign: "middle" });
    s.addText(p[1], { x: 4.4, y: y + 0.12, w: 6.0, h: 0.8, fontSize: 12, color: TEXT2, valign: "middle" });
    s.addText(`${p[2]} XOF`, { x: 10.5, y: y + 0.12, w: 2.1, h: 0.8, fontSize: 14, bold: true, color: GREEN, align: "right", valign: "middle" });
  });
  footer(s, 14);
}

/* =========================================================
   15 — CLOSING
========================================================= */
{
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  if (LOGO) {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 0.85, w: 0.95, h: 0.95, fill: { color: WHITE }, rectRadius: 0.12 });
    s.addImage({ path: LOGO, x: 1.0, y: 0.95, w: 0.75, h: 0.75 });
  }
  s.addText("Wergu Yaram", { x: 2.0, y: 0.95, w: 8, h: 0.7, fontSize: 24, bold: true, color: WHITE });
  s.addText("Prochaine étape", { x: 0.9, y: 3.0, w: 11, h: 0.6, fontSize: 16, color: TEAL, bold: true, charSpacing: 2 });
  s.addText("Activer les revenus, construire la récurrence,\nmesurer — et passer à l'échelle.", { x: 0.9, y: 3.6, w: 11.5, h: 1.6, fontSize: 32, bold: true, color: WHITE });
  s.addText("La santé pour tous, financée durablement.", { x: 0.95, y: 5.4, w: 11, h: 0.5, fontSize: 16, color: "B7C0D6" });
}

await pptx.writeFile({ fileName: "docs/business-model-canvas.pptx" });
console.log("✓ docs/business-model-canvas.pptx");

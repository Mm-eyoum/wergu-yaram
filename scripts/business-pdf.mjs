/**
 * Génère le PDF « Business Model complet » de Wergu Yaram, à la charte.
 *
 *   node scripts/business-pdf.mjs
 *
 * Construit un HTML brandé (sections + tableaux + canvas BMC) puis le rend en
 * PDF A4 via Playwright (même moteur que scripts/og-images.mjs). Aucun service
 * externe / auth requis. Sortie : docs/business-model.pdf
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const OUT_DIR = "docs";
mkdirSync(OUT_DIR, { recursive: true });

const GREEN = "#007A5E";
const GREEN_LIGHT = "#00A878";
const TEAL = "#00B894";
const NAVY = "#0B1F49";
const MINT = "#EEFDF8";
const SOFT = "#F7FBFA";
const BORDER = "#E6EEF2";
const TEXT2 = "#667085";

const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());

const LOGO = (() => {
  try {
    return `data:image/png;base64,${readFileSync("public/logo.png").toString("base64")}`;
  } catch {
    return "";
  }
})();

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---- BMC content (9 blocks) ---- */
const BMC = {
  partners: [
    "Bictorys — mobile money (Wave, Orange Money, MTN, carte)",
    "Structures de santé & ordres professionnels",
    "ONG, fondations, institutions, bailleurs",
    "Google Places / OpenStreetMap (annuaire & carte)",
    "Chatwoot / Brevo (support & email)",
    "Firebase / Google Cloud (infrastructure)",
  ],
  activities: [
    "Production & curation de contenu vérifié",
    "Développement & exploitation de la plateforme",
    "Modération & animation de la communauté",
    "Acquisition / SEO / growth",
    "Vente B2B (structures, partenaires)",
    "Traitement des paiements & reversements",
  ],
  resources: [
    "Référentiel santé vérifié (UEMOA/LME) — moat de contenu",
    "Plateforme tech (React + Firebase serverless, Typesense)",
    "Annuaire des structures (effet réseau)",
    "Audience & communauté engagée",
    "Marque de confiance + comité éditorial",
    "Intégration mobile money (Bictorys)",
  ],
  value: [
    "Information santé vérifiée & gratuite (DCI/UEMOA, pathologies)",
    "Annuaire géolocalisé + pages crédibles (Vérifié / Pro)",
    "Collecte de fonds traçable pour équipements (impact mesurable)",
    "Communauté & forum de confiance (rôles soignants)",
    "Billetterie d'événements santé",
    "Partenaires : visibilité ciblée + data d'impact",
  ],
  relationships: [
    "Self-service (comptes, pages, tableau de bord)",
    "Communauté & forum modérés",
    "Support (Chatwoot + messagerie in-app)",
    "Contenu éditorial régulier (confiance)",
    "Abonnements (relation récurrente structures)",
  ],
  channels: [
    "Web / PWA — SEO du référentiel = moteur d'acquisition",
    "Recherche fédérée (Typesense)",
    "Réseaux sociaux & partage de campagnes",
    "Communautés WhatsApp / églises (canal local)",
    "Newsletter / email",
    "Bouche-à-oreille & parrainage",
  ],
  segments: [
    "Grand public : patients & aidants",
    "Donateurs (locaux + récurrents)",
    "Structures de santé (hôpitaux, cliniques, CSPS)",
    "Partenaires / ONG / institutions / bailleurs",
    "Organisateurs d'événements santé",
    "Soignants (forum, contenu)",
  ],
  costs: [
    "Infrastructure cloud (coût marginal faible)",
    "Frais agrégateur mobile money (~1,2 %)",
    "Production éditoriale & modération",
    "Acquisition marketing (ads ciblées)",
    "Équipe & exploitation",
    "Conformité (TVA, protection des données / CDP)",
  ],
  revenue: [
    "Dons + pourboire plateforme optionnel (+ dons récurrents)",
    "Abonnements pages : Vérifié 9 900 / Pro 24 900 XOF / mois (−20 % annuel)",
    "Commission billetterie (8–10 %)",
    "Sponsoring de rubriques (150 k–400 k XOF / mois)",
    "Data / B2B & rapports d'impact (devis 500 k+ XOF)",
  ],
};

const li = (arr) => arr.map((x) => `<li>${esc(x)}</li>`).join("");

const lineCard = (n) => `
  <div class="line-card">
    <div class="line-head"><span class="line-badge">${n.prio}</span><h4>${esc(n.name)}</h4><span class="line-status">${esc(n.status)}</span></div>
    <p class="line-model">${esc(n.model)}</p>
    <div class="line-foot"><span>${esc(n.pricing)}</span><strong>${esc(n.revenue)}</strong></div>
  </div>`;

const LINES = [
  { prio: 1, name: "Dons — Crowdfunding équipement", status: "🟡 Câblé (flag OFF)", model: "Don + pourboire plateforme optionnel + dons récurrents", pricing: "Pourboire 0–6 %", revenue: "0,9–4,8 M XOF / an" },
  { prio: 2, name: "Pages structures (annuaire)", status: "🟢 Active", model: "Freemium → abonnement Vérifié / Pro + mise en avant", pricing: "9 900–24 900 XOF/mois", revenue: "1,2–6 M XOF / an" },
  { prio: 3, name: "Événements & formations", status: "🟡 En construction", model: "Billetterie one-time + commission organisateur", pricing: "2 500–15 000 XOF/billet", revenue: "0,4–2,5 M XOF / an" },
  { prio: 4, name: "Contenu santé & SEO", status: "🟢 Active", model: "Gratuit stratégique → sponsoring de rubrique (étiqueté)", pricing: "150 k–400 k XOF/mois", revenue: "0–2,4 M XOF / an" },
  { prio: 5, name: "Communauté & forum", status: "🟢 Active", model: "Non monétisé — moteur du flywheel (réduit le CAC)", pricing: "—", revenue: "Valeur indirecte" },
  { prio: 6, name: "Données & B2B santé", status: "⚪ Potentielle", model: "Licence rapports d'impact / dashboard B2B", pricing: "Devis 500 k+ XOF", revenue: "0–3 M XOF / an" },
];

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Inter, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: ${NAVY}; font-size: 11px; line-height: 1.5; }
  .page { padding: 28mm 18mm 22mm; }
  h1,h2,h3,h4 { color: ${NAVY}; line-height: 1.2; }
  h2 { font-size: 19px; margin: 0 0 4px; }
  .rule { height: 3px; width: 54px; background: ${GREEN}; border-radius: 2px; margin-bottom: 14px; }
  p { margin: 0 0 8px; }
  .muted { color: ${TEXT2}; }
  .break { break-before: page; }
  section { break-inside: avoid; }

  /* Cover */
  .cover { height: 100vh; display: flex; flex-direction: column; justify-content: space-between;
    padding: 40mm 22mm; color: #fff; background: linear-gradient(135deg, ${TEAL} 0%, ${GREEN_LIGHT} 55%, #0B7D5C 100%); }
  .cover .top { display: flex; align-items: center; gap: 14px; }
  .cover .top img { height: 52px; width: 52px; border-radius: 12px; background: #fff; padding: 6px; }
  .cover .brand { font-size: 24px; font-weight: 800; }
  .cover h1 { color: #fff; font-size: 46px; font-weight: 800; letter-spacing: -1px; }
  .cover .sub { font-size: 18px; opacity: .95; margin-top: 10px; font-weight: 500; }
  .cover .pill { align-self: flex-start; background: rgba(255,255,255,.18); padding: 7px 16px; border-radius: 999px; font-weight: 700; letter-spacing: 1px; font-size: 12px; }
  .cover .meta { font-size: 13px; opacity: .9; }

  table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 10px; }
  th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid ${BORDER}; vertical-align: top; }
  th { background: ${SOFT}; color: ${TEXT2}; text-transform: uppercase; font-size: 8.5px; letter-spacing: .5px; }
  tr { break-inside: avoid; }

  .lines { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .line-card { border: 1px solid ${BORDER}; border-radius: 12px; padding: 11px 12px; background: #fff; }
  .line-head { display: flex; align-items: center; gap: 7px; }
  .line-head h4 { font-size: 12px; flex: 1; }
  .line-badge { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; background: ${GREEN}; color: #fff; font-size: 10px; font-weight: 800; }
  .line-status { font-size: 9px; color: ${TEXT2}; }
  .line-model { font-size: 10px; color: ${TEXT2}; margin: 6px 0; }
  .line-foot { display: flex; justify-content: space-between; font-size: 10px; border-top: 1px dashed ${BORDER}; padding-top: 6px; }
  .line-foot strong { color: ${GREEN}; }

  /* BMC canvas */
  .bmc { display: grid; grid-template-columns: repeat(10, 1fr); grid-auto-rows: minmax(150px, auto); gap: 6px; }
  .bmc-cell { border: 1px solid ${BORDER}; border-radius: 8px; padding: 8px 9px; background: #fff; }
  .bmc-cell h4 { font-size: 9.5px; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 5px; }
  .bmc-cell ul { list-style: none; }
  .bmc-cell li { font-size: 8.7px; color: ${TEXT2}; padding-left: 9px; position: relative; margin-bottom: 3px; line-height: 1.35; }
  .bmc-cell li::before { content: "•"; color: ${GREEN}; position: absolute; left: 0; }
  .c-kp { grid-column: 1 / 3; grid-row: 1 / 3; }
  .c-ka { grid-column: 3 / 5; grid-row: 1 / 2; }
  .c-kr { grid-column: 3 / 5; grid-row: 2 / 3; }
  .c-vp { grid-column: 5 / 7; grid-row: 1 / 3; background: ${MINT}; }
  .c-cr { grid-column: 7 / 9; grid-row: 1 / 2; }
  .c-ch { grid-column: 7 / 9; grid-row: 2 / 3; }
  .c-cs { grid-column: 9 / 11; grid-row: 1 / 3; }
  .c-co { grid-column: 1 / 6; }
  .c-rev { grid-column: 6 / 11; background: ${MINT}; }

  ul.plain { margin: 4px 0 10px 16px; }
  ul.plain li { margin-bottom: 4px; }
  .flywheel { background: ${SOFT}; border: 1px solid ${BORDER}; border-radius: 10px; padding: 12px 14px; font-size: 11px; }
  .flywheel b { color: ${GREEN}; }
  .scorecard td:nth-child(2) { font-weight: 800; color: ${GREEN}; width: 60px; }
  .callout { background: ${MINT}; border-left: 4px solid ${GREEN}; border-radius: 8px; padding: 10px 14px; margin: 10px 0; }
  .landscape { /* BMC wide section still fits A4 portrait via small cells */ }
  .lead { font-size: 12px; }
  .kfig { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin: 8px 0 12px; }
  .kfig div { border: 1px solid ${BORDER}; border-radius: 10px; padding: 10px; text-align: center; }
  .kfig .v { font-size: 18px; font-weight: 800; color: ${GREEN}; }
  .kfig .l { font-size: 9px; color: ${TEXT2}; }
</style></head><body>

<!-- COVER -->
<div class="cover">
  <div class="top">${LOGO ? `<img src="${LOGO}" alt="">` : ""}<span class="brand">Wergu Yaram</span></div>
  <div>
    <span class="pill">BUSINESS MODEL</span>
    <h1>Business Model<br>de la plateforme</h1>
    <div class="sub">Plateforme santé, communauté & solidarité — Sénégal · XOF</div>
  </div>
  <div class="meta">Document stratégique &amp; financier · ${esc(DATE)}</div>
</div>

<!-- 2. RÉSUMÉ EXÉCUTIF -->
<div class="page break">
  <section>
    <h2>1 · Résumé exécutif</h2><div class="rule"></div>
    <p class="lead">Wergu Yaram est une plateforme <b>santé + communauté + collecte de fonds</b> à vocation chrétienne pour l'Afrique de l'Ouest (Sénégal, devise <b>XOF</b>). Elle combine un référentiel médical vérifié (DCI/UEMOA), un annuaire géolocalisé des structures de santé, une communauté, et une mécanique de dons sur mobile money (Wave, Orange Money, MTN) via Bictorys.</p>
    <p>Le socle technique et l'audience sont solides ; l'enjeu est la <b>monétisation</b>. Six lignes de revenu ont été identifiées, articulées autour d'un <b>flywheel</b> : un contenu vérifié et gratuit attire un trafic organique qualifié, qui nourrit la confiance, qui se convertit en dons, abonnements et billets — revenus réinvestis dans le contenu.</p>
    <div class="kfig">
      <div><div class="v">6</div><div class="l">lignes de business</div></div>
      <div><div class="v">85–95 %</div><div class="l">marge brute</div></div>
      <div><div class="v">3–12 M</div><div class="l">XOF — objectif An 1</div></div>
      <div><div class="v">7/10</div><div class="l">santé écosystème</div></div>
    </div>
    <div class="callout"><b>Priorité absolue (cash le plus rapide)</b> : activer les dons (Bictorys) + pourboire optionnel, puis construire la récurrence (abonnements de pages structures = MRR).</div>
  </section>

  <section style="margin-top:18px">
    <h2>2 · Lignes de business</h2><div class="rule"></div>
    <div class="lines">${LINES.map(lineCard).join("")}</div>
  </section>
</div>

<!-- 3. BMC -->
<div class="page break">
  <section>
    <h2>3 · Business Model Canvas</h2><div class="rule"></div>
    <div class="bmc">
      <div class="bmc-cell c-kp" style="border-top-color:${NAVY}"><h4>Partenaires clés</h4><ul>${li(BMC.partners)}</ul></div>
      <div class="bmc-cell c-ka" style="border-top-color:${TEAL}"><h4>Activités clés</h4><ul>${li(BMC.activities)}</ul></div>
      <div class="bmc-cell c-kr" style="border-top-color:${TEAL}"><h4>Ressources clés</h4><ul>${li(BMC.resources)}</ul></div>
      <div class="bmc-cell c-vp" style="border-top-color:${GREEN}"><h4>Propositions de valeur</h4><ul>${li(BMC.value)}</ul></div>
      <div class="bmc-cell c-cr" style="border-top-color:${TEAL}"><h4>Relations clients</h4><ul>${li(BMC.relationships)}</ul></div>
      <div class="bmc-cell c-ch" style="border-top-color:${TEAL}"><h4>Canaux</h4><ul>${li(BMC.channels)}</ul></div>
      <div class="bmc-cell c-cs" style="border-top-color:${NAVY}"><h4>Segments de clientèle</h4><ul>${li(BMC.segments)}</ul></div>
      <div class="bmc-cell c-co" style="border-top-color:${TEXT2}"><h4>Structure de coûts</h4><ul>${li(BMC.costs)}</ul></div>
      <div class="bmc-cell c-rev" style="border-top-color:${GREEN}"><h4>Sources de revenus</h4><ul>${li(BMC.revenue)}</ul></div>
    </div>
  </section>
</div>

<!-- 4. PRICING & UNIT ECONOMICS -->
<div class="page break">
  <section>
    <h2>4 · Pricing &amp; unit economics (XOF)</h2><div class="rule"></div>
    <table>
      <thead><tr><th>Ligne</th><th>Modèle</th><th>Entrée</th><th>Premium</th><th>CAC</th><th>LTV</th><th>LTV/CAC</th><th>Marge</th></tr></thead>
      <tbody>
        <tr><td>Dons</td><td>Don + frais opt.</td><td>500 XOF</td><td>5 000/mois (récurrent)</td><td>~0 / 1 200</td><td>12 000 → 60 000</td><td>10×–∞</td><td>~94 %*</td></tr>
        <tr><td>Pages structures</td><td>Abonnement</td><td>Gratuit</td><td>9 900 → 24 900/mois</td><td>8 000</td><td>178 000</td><td>~22×</td><td>~88 %</td></tr>
        <tr><td>Billetterie</td><td>One-time + commission</td><td>Gratuit</td><td>2 500–15 000/billet</td><td>~0</td><td>variable</td><td>élevé</td><td>~90 %</td></tr>
        <tr><td>Sponsoring</td><td>Rubrique sponsorisée</td><td>—</td><td>150 k–400 k/mois</td><td>vente B2B</td><td>multi-mois</td><td>—</td><td>~95 %</td></tr>
        <tr><td>Data / B2B</td><td>Licence / devis</td><td>—</td><td>500 k+</td><td>vente directe</td><td>annuel</td><td>—</td><td>~85 %</td></tr>
      </tbody>
    </table>
    <p class="muted">* La « marge plateforme » sur les dons = pourboire/frais perçus − frais agrégateur ; le don lui-même est intégralement reversé à la structure.</p>
    <h3 style="margin-top:8px;font-size:13px">Grille abonnements pages</h3>
    <ul class="plain">
      <li><b>Gratuit</b> — page basique (nom, adresse, horaires). Objectif : remplir l'annuaire (effet réseau).</li>
      <li><b>Vérifié — 9 900 XOF/mois</b> — badge vérifié, photos, services, bouton contact, statistiques.</li>
      <li><b>Pro — 24 900 XOF/mois</b> — tout Vérifié + mise en avant annuaire/carte, publication d'événements, réponse prioritaire.</li>
      <li><b>−20 %</b> sur l'annuel (rétention).</li>
    </ul>
    <div class="callout">Hypothèses M12 (réaliste) : ~25 000 visiteurs/mois ; ~50 structures payantes ⇒ ~0,5 M XOF MRR pages + dons. Modèle de récurrence <b>par période payée à l'avance</b> (réaliste sur mobile money — pas de prélèvement automatique).</div>
  </section>
</div>

<!-- 5. SYNERGIES & FLYWHEEL -->
<div class="page break">
  <section>
    <h2>5 · Synergies &amp; flywheel</h2><div class="rule"></div>
    <div class="flywheel">
      <b>Contenu santé vérifié (SEO gratuit)</b> → trafic organique qualifié (CAC ≈ 0) → inscriptions &amp; communauté engagée → <b>confiance</b> → dons + pages payantes + billets → revenus réinvestis dans le contenu &amp; la modération ↺
    </div>
    <ul class="plain" style="margin-top:10px">
      <li><b>Moteur principal</b> : contenu vérifié (autorité) couplé à la confiance communautaire.</li>
      <li><b>Goulot actuel</b> : paiement non activé + données encore en seed → finir l'activation et la migration.</li>
      <li><b>Effets de réseau</b> : annuaire (plus de structures = plus utile), communauté (direct), data (plus de besoins = meilleurs insights B2B).</li>
    </ul>
  </section>

  <section style="margin-top:16px">
    <h2>6 · Funnel de monétisation &amp; KPIs</h2><div class="rule"></div>
    <ul class="plain">
      <li><b>Découverte</b> (SEO, carte) → capter l'email.</li>
      <li><b>Activation</b> (recherche sauvegardée, communauté, besoin) → moment « aha ».</li>
      <li><b>1ʳᵉ conversion</b> : micro-don 500–1 000 XOF (Wave, 1 tap).</li>
      <li><b>Rétention</b> : don récurrent, updates de campagne, newsletter.</li>
      <li><b>Expansion</b> : page structure, billet, passage Pro.</li>
      <li><b>Advocacy</b> : partage de campagne, parrainage.</li>
    </ul>
    <p class="muted"><b>KPIs</b> : GMV dons/mois, take rate (pourboire moyen), MRR pages, conversion don, ARPPU, churn pages (&lt;5 %), LTV/CAC, K-factor.</p>
  </section>
</div>

<!-- 7. ROADMAP -->
<div class="page break">
  <section>
    <h2>7 · Roadmap 12 mois</h2><div class="rule"></div>
    <table>
      <thead><tr><th>Période</th><th>Chantiers</th><th>Revenu cumulé estimé</th></tr></thead>
      <tbody>
        <tr><td><b>M1–M3</b><br>Fondations</td><td>Activer Bictorys + pourboire ; finir migration mock→Firestore ; instrumenter KPIs ; registre transactions.</td><td>0,1–0,6 M XOF</td></tr>
        <tr><td><b>M4–M6</b><br>Accélération</td><td>Abonnements pages (Vérifié/Pro) + badge + tri featured ; dons récurrents ; premiers sponsors.</td><td>0,8–3 M XOF</td></tr>
        <tr><td><b>M7–M9</b><br>Expansion</td><td>Billetterie événements ; cross-sell ; dashboard revenus complet.</td><td>2–6 M XOF</td></tr>
        <tr><td><b>M10–M12</b><br>Optimisation</td><td>Optimisation pricing/funnel ; reporting automatisé ; 1ᵉʳ deal data/B2B.</td><td>3–12 M XOF</td></tr>
      </tbody>
    </table>
    <div class="callout"><b>Objectif An 1</b> : 3–12 M XOF · ~50–150 structures payantes (ou équivalent) · break-even opérationnel léger dès que le MRR pages couvre l'hébergement + la modération (M6–M9).</div>
  </section>

  <section style="margin-top:14px">
    <h2>8 · Risques &amp; conformité</h2><div class="rule"></div>
    <ul class="plain">
      <li><b>Paiement</b> : mobile money via agrégateur agréé (Bictorys) ; PCI géré côté checkout hébergé.</li>
      <li><b>Fiscalité</b> : TVA sénégalaise sur les services digitaux (abonnements/commission) — prévoir la facturation.</li>
      <li><b>Données</b> : conformité CDP Sénégal (équivalent RGPD), surtout pour la ligne Data/B2B (anonymisation).</li>
      <li><b>Marché</b> : faible volonté de payer → prioriser les modèles à friction nulle (pourboire, freemium) avant les abonnements.</li>
      <li><b>Réputation</b> (santé) : sponsoring strictement non-promotionnel — jamais de marque de médicament.</li>
    </ul>
  </section>
</div>

<!-- 9. SCORECARD -->
<div class="page break">
  <section>
    <h2>9 · Scorecard écosystème</h2><div class="rule"></div>
    <table class="scorecard">
      <thead><tr><th>Dimension</th><th>/10</th><th>Commentaire</th></tr></thead>
      <tbody>
        <tr><td>Diversification des revenus</td><td>6</td><td>6 lignes, mais 1 seule câblée (et désactivée).</td></tr>
        <tr><td>Synergies entre lignes</td><td>8</td><td>Flywheel contenu→confiance→dons/pages cohérent.</td></tr>
        <tr><td>Rétention &amp; récurrence</td><td>4</td><td>Aujourd'hui 100 % ponctuel ; récurrence à construire.</td></tr>
        <tr><td>Scalabilité</td><td>8</td><td>Serverless + contenu = coût marginal quasi nul.</td></tr>
        <tr><td>Défensabilité</td><td>7</td><td>Contenu vérifié + annuaire (réseau) + confiance.</td></tr>
        <tr><td>Efficacité d'acquisition</td><td>7</td><td>Fort potentiel organique (SEO santé, communautés).</td></tr>
        <tr><td>Marge</td><td>9</td><td>85–95 % sur toutes les lignes monétisables.</td></tr>
        <tr><td>Time-to-revenue</td><td>8</td><td>Dons activables en jours (code prêt).</td></tr>
        <tr><td><b>Santé globale</b></td><td><b>7</b></td><td>Excellent socle ; débloquer paiement + couche récurrente.</td></tr>
      </tbody>
    </table>
  </section>

  <!-- ANNEXE -->
  <section style="margin-top:16px">
    <h2>Annexe · État d'implémentation</h2><div class="rule"></div>
    <p class="muted">Le socle de monétisation est déjà codé sur la plateforme (rail Bictorys étendu, registre transactionnel unifié).</p>
    <table>
      <thead><tr><th>Brique</th><th>Statut</th></tr></thead>
      <tbody>
        <tr><td>Pourboire de don + registre <code>transactions</code></td><td>✅ Livré</td></tr>
        <tr><td>Abonnements pages (Vérifié/Pro), badge &amp; tri featured</td><td>✅ Livré</td></tr>
        <tr><td>Rappels de renouvellement (in-app, planifié)</td><td>✅ Livré</td></tr>
        <tr><td>Billetterie événements + page d'accueil dédiée</td><td>✅ Livré</td></tr>
        <tr><td>Dashboard revenus admin (GMV, take rate, MRR)</td><td>✅ Livré</td></tr>
        <tr><td>Sponsoring de contenu (champ CMS + bandeau étiqueté)</td><td>✅ Livré</td></tr>
        <tr><td>Activation Bictorys (clés + flag) — étape ops</td><td>⏳ À activer</td></tr>
        <tr><td>Envoi d'emails (rappels/newsletter), TVA/facturation</td><td>⏳ Différé / externe</td></tr>
      </tbody>
    </table>
  </section>
</div>

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });

const footer = `<div style="font-size:8px;color:#98A2B3;width:100%;padding:0 18mm;display:flex;justify-content:space-between;font-family:Inter,sans-serif">
  <span>Wergu Yaram — Business Model · confidentiel</span><span class="pageNumber"></span>/<span class="totalPages"></span>
</div>`;

await page.pdf({
  path: `${OUT_DIR}/business-model.pdf`,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: footer,
  margin: { top: "0", bottom: "14mm", left: "0", right: "0" },
});

await browser.close();

const bytes = readFileSync(`${OUT_DIR}/business-model.pdf`).length;
console.log(`✓ docs/business-model.pdf (${(bytes / 1024).toFixed(0)} Ko)`);

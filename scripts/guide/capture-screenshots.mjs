// Capture fraîche et homogène des écrans Wergu Yaram pour le guide utilisateur.
// Lance Chromium (Playwright) sur le dev server local (http://localhost:5173),
// se connecte avec le compte de seed pour les pages protégées/admin/partenaire,
// et écrit les PNG dans docs/guide/screenshots/.
//
// Usage : npm run dev (dans un autre terminal) puis `node scripts/guide/capture-screenshots.mjs`
import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT = join(ROOT, "docs", "guide", "screenshots");
const LEGACY = join(ROOT, "screenshots");
const FIGMA = join(ROOT, "Wergu_Yaram_Maquettes_UIUX_Figma_like", "01_pages_web");
const BASE = process.env.GUIDE_BASE_URL || "http://localhost:5173";

mkdirSync(OUT, { recursive: true });

// ---- Lire les identifiants de seed depuis .env.local (jamais codés en dur) ----
function readEnv(file) {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, file), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* fichier absent */ }
  return env;
}
const env = { ...readEnv(".env.example"), ...readEnv(".env.local") };
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || env.SEED_ADMIN_PASSWORD;

const VIEWPORT = { width: 1440, height: 900 };
const log = [];

// CSS pour masquer les widgets parasites (support Chatwoot, bannières cookies)
const HIDE_CSS = `
  .woot-widget-holder, .woot--bubble-holder, #cw-widget-holder, iframe[title*="chat" i],
  [class*="chatwoot" i], [id*="chatwoot" i],
  [class*="cookie" i], [id*="cookie" i], [class*="consent" i], [id*="consent" i] {
    display: none !important; visibility: hidden !important;
  }
  * { scroll-behavior: auto !important; }
`;

async function prep(page) {
  try { await page.addStyleTag({ content: HIDE_CSS }); } catch {}
  // laisser les polices/images se stabiliser
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
}

async function goto(page, path) {
  const url = path.startsWith("http") ? path : BASE + path;
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
}

// Substitution depuis les captures héritées / maquettes Figma si une route échoue
function fallback(name, legacyName, figmaName) {
  const candidates = [
    legacyName && join(LEGACY, legacyName),
    figmaName && join(FIGMA, figmaName),
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c)) {
      copyFileSync(c, join(OUT, `${name}.png`));
      log.push(`⚠︎  ${name} ← substitution (${c.replace(ROOT + "/", "")})`);
      return true;
    }
  }
  log.push(`✗  ${name} — échec, aucune substitution disponible`);
  return false;
}

async function shoot(page, name, path, { legacy, figma } = {}) {
  await goto(page, path);
  // détecter une redirection vers la connexion (page protégée non authentifiée)
  if (/\/connexion/.test(page.url()) && !path.includes("connexion")) {
    log.push(`↪  ${name} — redirigé vers /connexion (non authentifié)`);
    if (legacy || figma) return fallback(name, legacy, figma);
    return false;
  }
  await prep(page);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  log.push(`✓  ${name}  (${path})`);
  return true;
}

// Résout l'URL d'une page détail en cliquant le 1er lien correspondant sur une liste
async function shootDetail(page, name, listPath, hrefPrefix, fallbackSlug, opts = {}) {
  await goto(page, listPath);
  await page.waitForTimeout(700);
  let href = await page
    .locator(`a[href^="${hrefPrefix}"]`)
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (!href && fallbackSlug) href = `${hrefPrefix}${fallbackSlug}`;
  if (!href) {
    log.push(`✗  ${name} — aucun lien détail trouvé sous ${hrefPrefix}`);
    return opts.figma ? fallback(name, opts.legacy, opts.figma) : false;
  }
  return shoot(page, name, href, opts);
}

async function login(page) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    log.push("✗  Login impossible : SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD absents de .env.local");
    return false;
  }
  await goto(page, "/connexion");
  await prep(page);
  try {
    await page.locator('input[type="email"], input[name="email"]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type="password"], input[name="password"]').first().fill(ADMIN_PASSWORD);
    await Promise.all([
      page.waitForLoadState("networkidle").catch(() => {}),
      page.locator('button[type="submit"], button:has-text("Se connecter")').first().click(),
    ]);
    await page.waitForTimeout(2500);
    const ok = !/\/connexion/.test(page.url());
    log.push(ok ? `✓  Connecté en tant que ${ADMIN_EMAIL}` : `✗  Échec connexion (toujours sur /connexion)`);
    return ok;
  } catch (e) {
    log.push(`✗  Erreur login : ${e.message}`);
    return false;
  }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, locale: "fr-FR" });
  const page = await ctx.newPage();

  // ---------- PUBLIC ----------
  await shoot(page, "01_accueil", "/", { legacy: "01_home.png", figma: "01_home_portail_sante_recherche.png" });
  await shoot(page, "02_recherche", "/recherche?q=diab%C3%A8te", { legacy: "02_recherche.png", figma: "02_resultats_recherche_universelle.png" });
  await shootDetail(page, "03_medicament", "/recherche?q=paracetamol", "/medicaments/", "paracetamol", { legacy: "03_medicament.png", figma: "03_detail_medicament.png" });
  await shoot(page, "04_pathologie", "/pathologies/diabete-type-2", { legacy: "04_pathologie.png", figma: "04_detail_pathologie.png" });
  await shootDetail(page, "05_article", "/recherche?q=sant%C3%A9", "/articles/", null, { legacy: "11_article.png", figma: "11_article_sante_detail.png" });
  await shoot(page, "06_etablissements", "/etablissements", { legacy: "05_etablissement.png" });
  await shoot(page, "07_etablissement_detail", "/etablissements/chn-fann", { legacy: "05_etablissement.png", figma: "05_detail_etablissement.png" });
  await shoot(page, "08_revendiquer", "/etablissements/revendiquer");
  await shoot(page, "09_carte", "/carte");
  await shoot(page, "10_communautes", "/communautes", { legacy: "communautes_liste.png" });
  await shootDetail(page, "11_communaute_detail", "/communautes", "/communautes/", null, { legacy: "06_communaute.png", figma: "06_communaute_social.png" });
  await shoot(page, "12_forum", "/forum", { legacy: "12_forum.png", figma: "12_forum_sante.png" });
  await shoot(page, "13_besoins", "/besoins", { legacy: "07_besoins.png", figma: "07_besoins_equipement_liste.png" });
  await shootDetail(page, "14_besoin_detail", "/besoins", "/besoins/", null, { legacy: "15_besoin_don.png", figma: "15_detail_besoin_donation.png" });
  await shoot(page, "15_evenements", "/evenements");
  await shootDetail(page, "16_evenement_detail", "/evenements", "/evenements/", null, { legacy: "14_evenement.png", figma: "14_evenement_detail.png" });
  await shoot(page, "17_formations", "/formations");
  await shootDetail(page, "18_formation_detail", "/formations", "/formations/", null);
  await shoot(page, "19_partenaires", "/partenaires", { legacy: "16_partenaires.png", figma: "16_partenaires_annuaire.png" });
  await shootDetail(page, "20_partenaire_detail", "/partenaires", "/partenaires/", null);
  await shoot(page, "21_soutenir", "/soutenir");
  await shoot(page, "22_connexion", "/connexion", { legacy: "09_connexion.png", figma: "09_connexion.png" });
  await shoot(page, "23_inscription", "/inscription", { legacy: "10_inscription.png", figma: "10_inscription.png" });

  // ---------- AUTHENTIFIÉ ----------
  const authed = await login(page);

  await shoot(page, "24_dashboard", "/dashboard", { figma: "08_dashboard_profil_utilisateur.png" });
  await shoot(page, "25_profil", "/dashboard/profile", { figma: "08_dashboard_profil_utilisateur.png" });
  await shoot(page, "26_mes_dons", "/dashboard/dons");
  await shoot(page, "27_verification_pro", "/dashboard/verification-pro");
  await shoot(page, "28_messages", "/messages", { figma: "13_messages_prives.png" });

  // ---------- PRO ----------
  await shoot(page, "29_creer_page", "/dashboard/pages/new");
  await shoot(page, "30_gerer_etablissement", "/dashboard/facilities/chn-fann");

  // ---------- PARTENAIRE (espace ASSAD) ----------
  await shoot(page, "31_espace_partenaire", "/espace/assad");
  await shoot(page, "32_partenaire_gestion", "/espace/assad/gestion");
  await shoot(page, "33_partenaire_contenus", "/espace/assad/gestion/contenus");
  await shoot(page, "34_partenaire_campagnes", "/espace/assad/gestion/campagnes");
  await shoot(page, "35_partenaire_parametres", "/espace/assad/gestion/parametres");

  // ---------- ADMIN ----------
  await shoot(page, "36_admin_accueil", "/admin");
  await shoot(page, "37_admin_contenus", "/admin/content");
  await shoot(page, "38_admin_utilisateurs", "/admin/users");
  await shoot(page, "39_admin_moderation", "/admin/moderation");
  await shoot(page, "40_admin_annuaire", "/admin/directory");
  await shoot(page, "41_admin_revenus", "/admin/revenue");
  await shoot(page, "42_admin_campagnes", "/admin/campaigns");
  await shoot(page, "43_admin_parametres", "/admin/settings");

  await browser.close();

  console.log("\n========= RÉCAPITULATIF CAPTURES =========");
  for (const l of log) console.log(l);
  const ok = log.filter((l) => l.startsWith("✓")).length;
  const sub = log.filter((l) => l.startsWith("⚠")).length;
  const fail = log.filter((l) => l.startsWith("✗")).length;
  console.log(`\n${ok} OK · ${sub} substitutions · ${fail} échecs · auth=${authed}`);
  console.log("Sortie :", OUT);
})();

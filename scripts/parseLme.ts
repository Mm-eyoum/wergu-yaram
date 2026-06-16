/**
 * Parser de la Liste Nationale des Médicaments Essentiels (LME) — Burkina Faso,
 * Édition 2023. Transforme l'extraction `pdftotext -layout` (scripts/data/lme2023.txt)
 * en données structurées :
 *   - src/data/lme/medications.generated.json   (médicaments, fusionnés par DCI)
 *
 * Méthode : détection des bandes de colonnes à partir des en-têtes de tableau
 * (DCI / Forme / Dosage / CSPS / CM / CMA / CH), reconstruction des lignes
 * multi-cellules, fusion par DCI (adultes + enfants), classification AWaRe.
 *
 * Conformité UEMOA (Règlement N°04/2020) : nommage en DCI, une présentation par
 * forme/dosage, métadonnées réglementaires, médicament essentiel. Aucun contenu
 * clinique n'est inventé ici — l'enrichissement se fait dans mockMedications.ts.
 *
 * Lancer :  npx tsx scripts/parseLme.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "data/lme2023.txt");
const OUT_DIR = resolve(__dirname, "../src/data/lme");

const REGULATORY = {
  authority: "Agence Nationale de Régulation Pharmaceutique (ANRP, Burkina Faso)",
  listEdition: "LME Burkina Faso 2023",
  ammRequired: true,
  ammValidityYears: 5,
};

// --- Helpers -------------------------------------------------------------

const stripAccents = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const slugify = (s: string): string =>
  stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Clé de normalisation d'un intitulé (sans accent, sans ponctuation). */
const normKey = (s: string): string =>
  stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Intitulés corrects (accents, ponctuation) des groupes pharmaco-thérapeutiques
 * et catégories de dispositifs, indexés par clé normalisée. Certains intitulés du
 * PDF sont tronqués par la mise en page : ils sont mappés ici également.
 */
const GROUP_LABELS: Record<string, string> = {
  "anesthesiques": "Anesthésiques",
  "analgesiques antipyretiques a i n s": "Analgésiques, antipyrétiques, AINS",
  "antiallergiques et antianaphylactiques": "Antiallergiques et antianaphylactiques",
  "antidote et traitement des intoxications": "Antidotes et traitement des intoxications",
  "antiepileptiques et anticonvulsivants": "Antiépileptiques et anticonvulsivants",
  "anti infectieux": "Anti-infectieux",
  "antimigraineux": "Antimigraineux",
  "antineoplasiques immunosuppresseurs et immunomodulateurs":
    "Antinéoplasiques, immunosuppresseurs et immunomodulateurs",
  "antineoplasiques immunomodulateurs et immunosuppresseurs":
    "Antinéoplasiques, immunosuppresseurs et immunomodulateurs",
  "medicaments utilises en hematologie": "Médicaments utilisés en hématologie",
  "derives du sang et substituts du plasma": "Dérivés du sang et substituts du plasma",
  "medicaments de l appareil cardio vasculaire": "Médicaments de l'appareil cardio-vasculaire",
  "diuretiques": "Diurétiques",
  "medicaments utilises en dermatologie topique": "Médicaments utilisés en dermatologie (topique)",
  "produits a usage diagnostic": "Produits à usage diagnostic",
  "produits de diagnostic": "Produits de diagnostic",
  "desinfectants et antiseptiques": "Désinfectants et antiseptiques",
  "antiseptiques et desinfectants": "Antiseptiques et désinfectants",
  "medicaments du tube digestif": "Médicaments du tube digestif",
  "medicaments utilises en gastro enterologie": "Médicaments utilisés en gastro-entérologie",
  "hormones et autres medicaments utilises en endocrinologie":
    "Hormones et autres médicaments utilisés en endocrinologie",
  "preparations immunologiques": "Préparations immunologiques",
  "myorelaxants et inhibiteurs de la cholinesterase": "Myorelaxants et inhibiteurs de la cholinestérase",
  "medicaments utilises en psychiatrie": "Médicaments utilisés en psychiatrie",
  "medicaments de l appareil respiratoire": "Médicaments de l'appareil respiratoire",
  "medicaments specifiques a la neonatologie": "Médicaments spécifiques à la néonatologie",
  "solutes electrolytes et medicaments des troubles acido basiques":
    "Solutés, électrolytes et médicaments des troubles acido-basiques",
  "solutes electrolytes et medicaments des troubles acido":
    "Solutés, électrolytes et médicaments des troubles acido-basiques",
  "vitamines et sels mineraux": "Vitamines et sels minéraux",
  "medicaments traditionnels ameliores": "Médicaments traditionnels améliorés",
  // Variantes d'intitulés (listes adultes / enfants) et groupes additionnels
  "antidotes": "Antidotes et traitement des intoxications",
  "analgesiques antipyretiques ainflammatoires et antigoutteux":
    "Analgésiques, antipyrétiques, anti-inflammatoires et antigoutteux",
  "analgesiques antipyretiques anti inflammatoires et antigoutteux":
    "Analgésiques, antipyrétiques, anti-inflammatoires et antigoutteux",
  "hormones contraceptifs et autres medicaments utilises en":
    "Hormones, contraceptifs et autres médicaments utilisés en endocrinologie",
  "medicaments utilises en ophtalmologie": "Médicaments utilisés en ophtalmologie",
  "medicaments ophtalmiques": "Médicaments ophtalmiques",
  "medicaments utilises en dermatologie topiques": "Médicaments utilisés en dermatologie (topique)",
  "ocytociques": "Ocytociques",
  "antiparkinsoniens": "Antiparkinsoniens",
  // Catégories de dispositifs médicaux
  "agrafeuses fils de suture et de ligature": "Agrafeuses, fils de suture et de ligature",
  "aiguilles catheters perfuseurs seringues transfuseurs":
    "Aiguilles, cathéters, perfuseurs, seringues, transfuseurs",
  "attelles bandes compresses cotons ceintures": "Attelles, bandes, compresses, cotons, ceintures",
  "boites et trousses de chirurgie bistouris ciseaux clamps":
    "Boîtes et trousses de chirurgie, bistouris, ciseaux, clamps",
  "canules drains sondes raccords prolongateurs valves filtres":
    "Canules, drains, sondes, raccords, prolongateurs, valves, filtres",
  "champs gants sous gants doigtiers lunettes masques sacs et":
    "Champs, gants, sous-gants, doigtiers, lunettes, masques, sacs",
  "clous lames plaques protheses vis": "Clous, lames, plaques, prothèses, vis",
  "mesure et diagnostic": "Mesure et diagnostic",
  "odonto stomatologie": "Odonto-stomatologie",
  "reactifs consommables et petits materiels de laboratoire":
    "Réactifs, consommables et petits matériels de laboratoire",
  "consommables et r": "Consommables et réactifs",
  "medecine nucleaire": "Médecine nucléaire",
};

/** Intitulé propre d'un groupe (table de correspondance, sinon mise en forme simple). */
function labelFor(raw: string): string {
  const key = normKey(raw);
  if (GROUP_LABELS[key]) return GROUP_LABELS[key];
  const lower = raw.replace(/\s+/g, " ").trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Mots-clés de forme galénique (sans accent), pour localiser le début de la
 * colonne « Forme » dans le texte d'une ligne. La forme s'étend du mot-clé
 * jusqu'au premier chiffre (= début du dosage).
 */
const FORM_KEYWORDS = [
  "comprime",
  "gelule",
  "sirop",
  "suspension",
  "solution",
  "poudre",
  "injectable",
  "suppositoire",
  "ovule",
  "creme",
  "pommade",
  "collyre",
  "inhalation",
  "aerosol",
  "cartouche",
  "patch",
  "implant",
  "granules",
  "pate",
  "lotion",
  "capsule",
  "emulsion",
  "vernis",
  "dispositif",
  "sachet",
  "spray",
  "gaz",
  "gel",
];

/** Sépare le texte central d'une ligne en (DCI, Forme, Dosage). */
function splitMiddle(middle: string): { dci: string; form: string; dosage: string } {
  const norm = stripAccents(middle).toLowerCase();
  let fStart = -1;
  for (const kw of FORM_KEYWORDS) {
    const m = new RegExp(`\\b${kw}`).exec(norm);
    if (m && (fStart < 0 || m.index < fStart)) fStart = m.index;
  }
  if (fStart < 0) return { dci: middle.trim(), form: "", dosage: "" };
  const dci = middle.slice(0, fStart).trim();
  const rest = middle.slice(fStart);
  const dm = /\d/.exec(rest);
  if (!dm) return { dci, form: rest.replace(/\s+/g, " ").trim(), dosage: "" };
  let dStart = dm.index;
  if (rest[dStart - 1] === "(") dStart -= 1;
  return {
    dci,
    form: rest.slice(0, dStart).replace(/\s+/g, " ").trim(),
    dosage: rest.slice(dStart).replace(/\s+/g, " ").trim(),
  };
}

interface Word {
  text: string;
  col: number;
}
const words = (line: string): Word[] => {
  const out: Word[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push({ text: m[0], col: m.index });
  return out;
};

const CARE_TOKEN = /^(X|NON)$/i;
const countCareTokens = (line: string): number =>
  words(line).filter((w) => CARE_TOKEN.test(w.text)).length;

// --- Column bands (from a table header line) -----------------------------

interface Bands {
  forme: number; // start col of "Forme"
  dosage: number; // start col of "Dosage"
  care: number; // start col of first care column ("CSPS")
  careCols: number[]; // start cols of CSPS, CM, CMA, CH
  hasDci: boolean; // false for "Désignation"-style tables
}

function parseHeader(line: string): Bands | null {
  const hasDci = /\bDCI\b/.test(line);
  const hasDesignation = /D[ée]signation/.test(line);
  if (!/CSPS/.test(line) || (!hasDci && !hasDesignation)) return null;
  const idx = (re: RegExp): number => {
    const m = re.exec(line);
    return m ? m.index : -1;
  };
  const careCols = ["CSPS", "CM", "CMA", "CH"]
    .map((c) => idx(new RegExp(`\\b${c}\\b`)))
    .filter((i) => i >= 0);
  return {
    forme: idx(/\bForme\b/),
    dosage: idx(/\bDosage\b/),
    care: idx(/\bCSPS\b/),
    careCols,
    hasDci,
  };
}

interface RawRow {
  dci: string;
  form: string;
  dosage: string;
  careLevels: { csps: boolean; cm: boolean; cma: boolean; ch: boolean };
  stars: number;
}

/** Niveaux de soins : associe chaque token X/NON à la colonne d'en-tête la plus proche. */
function careLevelsFrom(care: Word[], careCols: number[]): RawRow["careLevels"] {
  const levels = [false, false, false, false];
  for (const w of care) {
    if (!CARE_TOKEN.test(w.text)) continue;
    let best = 0;
    let bestD = Infinity;
    careCols.forEach((c, i) => {
      const d = Math.abs(w.col - c);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    levels[best] = /^X$/i.test(w.text);
  }
  return { csps: levels[0], cm: levels[1], cma: levels[2], ch: levels[3] };
}

/** Découpe une ligne de données : sépare le bloc « niveaux de soins » du texte central. */
function sliceMedRow(line: string, b: Bands): RawRow {
  const ws = words(line);
  const careStart = b.careCols[0] ?? b.care;
  const middle = ws.filter((w) => w.col < careStart - 3).map((w) => w.text).join(" ");
  const care = ws.filter((w) => w.col >= careStart - 3);
  const careLevels = careLevelsFrom(care, b.careCols);

  let middleText = middle.replace(/^\d{1,3}\.?\s*/, "").replace(/\bI(Injectable)/g, "$1");
  const stars = (middleText.match(/\*+/g)?.join("").length) ?? 0;
  middleText = middleText.replace(/\*+/g, " ").replace(/\s+/g, " ").trim();
  const { dci, form, dosage } = splitMiddle(middleText);
  return { dci, form, dosage: dosage.replace(/\bM\s+UI\b/g, "MUI").trim(), careLevels, stars };
}

// --- Section splitting ---------------------------------------------------

const raw = readFileSync(SRC, "utf8");
const lines = raw.split("\n");

const findLine = (re: RegExp, from = 0): number => {
  for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i;
  return -1;
};

const childStart = findLine(/ESSENTIELS POUR ENFANTS/);
const adultStart = findLine(/ESSENTIELS POUR ADULTES/);
// Borne la fin de la liste adultes (les sections suivantes — intrants nutritionnels
// et dispositifs médicaux — ne sont pas importées : hors périmètre de la plateforme).
const supplStart = findLine(/INTRANTS NUTRITIONNELS ESSENTIELS/);

// --- Médicament section parser -------------------------------------------

type Population = "adulte" | "enfant";

interface ParsedPresentation extends RawRow {
  group: string;
  subgroup: string;
  aware?: "Access" | "Watch" | "Reserve";
  population: Population;
  subgroupKey: string;
}

function isGroupHeading(line: string): { num: number; text: string } | null {
  const m = /^\s*(\d{1,2})\.\s+([\wÀ-ÿ/'’ ,().\-]+?)\s*$/.exec(line);
  if (!m) return null;
  if (countCareTokens(line) >= 2) return null;
  const text = m[2];
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 3) return null;
  const upper = (text.match(/[A-ZÀ-Ý]/g)?.length ?? 0) / letters.length;
  if (upper < 0.7) return null; // les lignes de données ont un DCI en casse mixte
  return { num: Number(m[1]), text: labelFor(text) };
}

function isSubgroupHeading(line: string): string | null {
  const m = /^\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\s+(\S.*\S)\s*$/.exec(line);
  if (!m || countCareTokens(line) >= 2) return null;
  return m[2].replace(/\s+/g, " ").trim();
}

function parseMedSection(start: number, end: number, population: Population): ParsedPresentation[] {
  const rows: ParsedPresentation[] = [];
  const footnotes = new Map<string, Record<number, string>>(); // subgroupKey -> {stars: text}
  let bands: Bands | null = null;
  let group = "";
  let subgroup = "";
  let aware: ParsedPresentation["aware"];
  let subgroupKey = "";

  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const header = parseHeader(line);
    if (header && header.hasDci) {
      bands = header;
      continue;
    }
    const g = isGroupHeading(line);
    if (g) {
      group = g.text;
      subgroup = "";
      aware = undefined;
      subgroupKey = `${population}:${g.num}`;
      continue;
    }
    const sg = isSubgroupHeading(line);
    if (sg) {
      subgroup = sg;
      subgroupKey = `${population}:${group}:${sg}`;
      // AWaRe ne s'applique qu'au sous-groupe d'antibiotiques concerné : réinitialisé sinon.
      const am = /Antibiotiques du groupe (Access|Watch|R[ée]serve)/i.exec(sg);
      aware = am
        ? ((/access/i.test(am[1]) ? "Access" : /watch/i.test(am[1]) ? "Watch" : "Reserve") as ParsedPresentation["aware"])
        : undefined;
      continue;
    }
    // Note de bas de tableau (* ou **)
    const fn = /^\s*(\*+)\s*(.+\S)\s*$/.exec(line);
    if (fn && !/^\s*\d/.test(line)) {
      const map = footnotes.get(subgroupKey) ?? {};
      map[fn[1].length] = fn[2].replace(/\s+/g, " ").trim();
      footnotes.set(subgroupKey, map);
      continue;
    }

    if (!bands) continue;
    const isRowStart = /^\s*\d{1,3}\.?\s/.test(line) && countCareTokens(line) >= 2;
    if (isRowStart) {
      const r = sliceMedRow(line, bands);
      if (!r.dci) continue; // ligne sans DCI (artefact OCR) — ignorée
      rows.push({ ...r, group, subgroup, aware, population, subgroupKey });
    } else if (rows.length && countCareTokens(line) === 0) {
      // Continuation d'une cellule : uniquement si le texte est aligné dans les
      // colonnes Forme/Dosage (>= colonne Forme). Exclut les notes de bas de page
      // en marge gauche (faux positifs de fusion).
      const firstCol = line.search(/\S/);
      const formeCol = bands.forme >= 0 ? bands.forme : bands.dosage;
      if (firstCol < 0 || formeCol < 0 || firstCol < formeCol - 5) continue;
      const last = rows[rows.length - 1];
      const text = line.replace(/\s+/g, " ").trim();
      // Numéros de page (ex. "41 41 41", "09 99") : uniquement des chiffres → ignorés.
      if (/^[\d ]+$/.test(text)) continue;
      if (/\d/.test(text)) last.dosage = `${last.dosage} ${text}`.replace(/\s+/g, " ").trim();
      else last.form = `${last.form} ${text}`.replace(/\s+/g, " ").trim();
    }
  }

  // Résolution des notes de bas de tableau.
  for (const r of rows) {
    if (!r.stars) continue;
    const note = footnotes.get(r.subgroupKey)?.[r.stars];
    if (note) (r as RawRow & { note?: string }).note = note;
  }
  return rows;
}

// --- Aggregate medications by DCI ----------------------------------------

interface OutPresentation {
  form: string;
  dosage?: string;
  careLevels: { csps: boolean; cm: boolean; cma: boolean; ch: boolean };
  populations: Population[];
  note?: string;
}
interface OutMedication {
  slug: string;
  dci: string;
  name: string;
  family: string;
  pharmacoTherapeuticGroup: string;
  subgroup?: string;
  awareCategory?: "Access" | "Watch" | "Reserve";
  essentialMedicine: boolean;
  productNature: "generique";
  forms: string[];
  dosage: string;
  presentations: OutPresentation[];
  summary: string;
  withoutPrescription: boolean;
  regulatory: typeof REGULATORY;
  trust: { verified: boolean; source: string; updatedAt: string };
  populations: Population[];
}

function aggregate(rows: ParsedPresentation[]): OutMedication[] {
  const byDci = new Map<string, ParsedPresentation[]>();
  for (const r of rows) {
    // Clé insensible aux accents → fusionne les variantes OCR ("Ibuprofène"/"Ibuprofene").
    const key = stripAccents(r.dci).toLowerCase().replace(/[^a-z0-9+]+/g, " ").trim();
    if (!byDci.has(key)) byDci.set(key, []);
    byDci.get(key)!.push(r);
  }
  const accentScore = (s: string): number => (s.match(/[À-ÿ]/g)?.length ?? 0);
  const meds: OutMedication[] = [];
  const usedSlugs = new Set<string>();
  for (const [, group] of byDci) {
    const first = group[0];
    // Nom d'affichage : variante la mieux accentuée (puis la plus longue).
    const dci = [...group]
      .map((r) => r.dci.replace(/\s+/g, " ").trim())
      .sort((a, b) => accentScore(b) - accentScore(a) || b.length - a.length)[0];
    let slug = slugify(dci);
    while (usedSlugs.has(slug)) slug = `${slug}-x`;
    usedSlugs.add(slug);

    // Fusionne les présentations identiques (forme + dosage).
    const presMap = new Map<string, OutPresentation>();
    for (const r of group) {
      const pk = `${r.form}::${r.dosage}`.toLowerCase();
      const existing = presMap.get(pk);
      const note = (r as RawRow & { note?: string }).note;
      if (existing) {
        existing.careLevels.csps ||= r.careLevels.csps;
        existing.careLevels.cm ||= r.careLevels.cm;
        existing.careLevels.cma ||= r.careLevels.cma;
        existing.careLevels.ch ||= r.careLevels.ch;
        if (!existing.populations.includes(r.population)) existing.populations.push(r.population);
        if (note && !existing.note) existing.note = note;
      } else {
        presMap.set(pk, {
          form: r.form || "—",
          dosage: r.dosage || undefined,
          careLevels: { ...r.careLevels },
          populations: [r.population],
          note,
        });
      }
    }
    const presentations = [...presMap.values()];
    const forms = [...new Set(presentations.map((p) => p.form).filter((f) => f && f !== "—"))];
    const dosage = [...new Set(presentations.map((p) => p.dosage).filter(Boolean))].join(" ; ");
    const populations = [...new Set(group.map((r) => r.population))];
    const aware = group.find((r) => r.aware)?.aware;
    const family = first.group || "Médicament essentiel";

    meds.push({
      slug,
      dci,
      name: dci,
      family,
      pharmacoTherapeuticGroup: first.group,
      subgroup: first.subgroup || undefined,
      awareCategory: aware,
      essentialMedicine: true,
      productNature: "generique",
      forms,
      dosage,
      presentations,
      summary: `${dci} — médicament essentiel (${family}) de la Liste Nationale des Médicaments Essentiels (Burkina Faso, 2023).`,
      withoutPrescription: false,
      regulatory: REGULATORY,
      trust: {
        verified: true,
        source: "Liste Nationale des Médicaments Essentiels — Burkina Faso, Édition 2023 (ANRP)",
        updatedAt: "2023-01-01",
      },
      populations,
    });
  }
  meds.sort((a, b) => a.dci.localeCompare(b.dci, "fr"));
  return meds;
}

// --- Run -----------------------------------------------------------------

const childRows = parseMedSection(childStart, adultStart, "enfant");
const adultRows = parseMedSection(adultStart, supplStart, "adulte");
const medications = aggregate([...adultRows, ...childRows]);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, "medications.generated.json"), JSON.stringify(medications, null, 2) + "\n");

console.log("Sections (lignes) :", { childStart, adultStart, supplStart });
console.log("Lignes de médicaments :", { enfants: childRows.length, adultes: adultRows.length });
console.log("Médicaments uniques (par DCI) :", medications.length);
console.log("→ src/data/lme/medications.generated.json");

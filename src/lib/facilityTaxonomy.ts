/**
 * Health-structure taxonomy (Senegal health-pyramid reference).
 *
 * Three orthogonal dimensions replace the old free-text `Facility.type`:
 *  - category : what kind of structure (poste de santé, hôpital, pharmacie…)
 *  - sector   : ownership/status (public, privé, confessionnel…)
 *  - level    : health-pyramid tier (périphérique, intermédiaire, national)
 *
 * The module also maps Google Places `types[]` and free-text names to a
 * category, so directory imports are auto-categorised (admin can correct).
 */

export type FacilityCategory =
  | "poste_sante"
  | "centre_sante"
  | "hopital"
  | "clinique"
  | "cabinet"
  | "cabinet_dentaire"
  | "pharmacie"
  | "laboratoire"
  | "imagerie"
  | "maternite"
  | "optique"
  | "centre_specialise"
  | "autre";

export type FacilitySector =
  | "public"
  | "prive"
  | "confessionnel"
  | "communautaire"
  | "parapublic"
  | "militaire";

export type FacilityLevel = "peripherique" | "intermediaire" | "national";

export const FACILITY_CATEGORY_LABELS: Record<FacilityCategory, string> = {
  poste_sante: "Poste de santé",
  centre_sante: "Centre de santé",
  hopital: "Hôpital",
  clinique: "Clinique",
  cabinet: "Cabinet médical",
  cabinet_dentaire: "Cabinet dentaire",
  pharmacie: "Pharmacie",
  laboratoire: "Laboratoire d'analyses",
  imagerie: "Centre d'imagerie",
  maternite: "Maternité",
  optique: "Optique",
  centre_specialise: "Centre spécialisé",
  autre: "Autre",
};

export const FACILITY_SECTOR_LABELS: Record<FacilitySector, string> = {
  public: "Public",
  prive: "Privé",
  confessionnel: "Confessionnel / associatif",
  communautaire: "Communautaire",
  parapublic: "Parapublic",
  militaire: "Militaire",
};

export const FACILITY_LEVEL_LABELS: Record<FacilityLevel, string> = {
  peripherique: "Périphérique",
  intermediaire: "Intermédiaire",
  national: "National",
};

export const FACILITY_CATEGORIES = Object.keys(FACILITY_CATEGORY_LABELS) as FacilityCategory[];
export const FACILITY_SECTORS = Object.keys(FACILITY_SECTOR_LABELS) as FacilitySector[];
export const FACILITY_LEVELS = Object.keys(FACILITY_LEVEL_LABELS) as FacilityLevel[];

/** `{ value, label }` option lists for SchemaForm `select` fields / filters. */
export const CATEGORY_OPTIONS = FACILITY_CATEGORIES.map((value) => ({
  value,
  label: FACILITY_CATEGORY_LABELS[value],
}));
export const SECTOR_OPTIONS = FACILITY_SECTORS.map((value) => ({
  value,
  label: FACILITY_SECTOR_LABELS[value],
}));
export const LEVEL_OPTIONS = FACILITY_LEVELS.map((value) => ({
  value,
  label: FACILITY_LEVEL_LABELS[value],
}));

export const categoryLabel = (c?: string): string =>
  (c && FACILITY_CATEGORY_LABELS[c as FacilityCategory]) || "";
export const sectorLabel = (s?: string): string =>
  (s && FACILITY_SECTOR_LABELS[s as FacilitySector]) || "";
export const levelLabel = (l?: string): string =>
  (l && FACILITY_LEVEL_LABELS[l as FacilityLevel]) || "";

// --- Map differentiation -------------------------------------------------
// A glyph + brand colour per category, consumed by the Leaflet pin builder.
// Colours are CSS hex (kept independent of leafletSetup's PIN_COLORS so the
// taxonomy module stays the single source of truth for category styling).
export type CategoryGlyph =
  | "hospital"
  | "clinic"
  | "stethoscope"
  | "tooth"
  | "pharmacy"
  | "flask"
  | "scan"
  | "baby"
  | "eye"
  | "plus";

interface CategoryStyle {
  glyph: CategoryGlyph;
  color: string;
}

export const CATEGORY_STYLE: Record<FacilityCategory, CategoryStyle> = {
  poste_sante: { glyph: "plus", color: "#2E8B57" },
  centre_sante: { glyph: "plus", color: "#007A5E" },
  hopital: { glyph: "hospital", color: "#0B6BCB" },
  clinique: { glyph: "clinic", color: "#00897B" },
  cabinet: { glyph: "stethoscope", color: "#6D4AFF" },
  cabinet_dentaire: { glyph: "tooth", color: "#8E7CFF" },
  pharmacie: { glyph: "pharmacy", color: "#1FA463" },
  laboratoire: { glyph: "flask", color: "#C2410C" },
  imagerie: { glyph: "scan", color: "#0E7490" },
  maternite: { glyph: "baby", color: "#DB2777" },
  optique: { glyph: "eye", color: "#7C3AED" },
  centre_specialise: { glyph: "plus", color: "#B45309" },
  autre: { glyph: "plus", color: "#0B1F49" },
};

export const categoryStyle = (c?: string): CategoryStyle =>
  (c && CATEGORY_STYLE[c as FacilityCategory]) || CATEGORY_STYLE.autre;

// --- Auto-categorisation -------------------------------------------------

/**
 * Map type tags to a category. Accepts both Google Places `types[]`
 * (e.g. "hospital", "pharmacy") and OpenStreetMap tag values (`amenity`/
 * `healthcare`, e.g. "doctors", "laboratory", "centre"). Returns null when no
 * health-relevant type is recognised (caller falls back to name inference).
 */
export function placeTypesToCategory(types: string[] | undefined | null): FacilityCategory | null {
  if (!types?.length) return null;
  const set = new Set(types.filter(Boolean).map((t) => t.toLowerCase()));
  // Most specific first. (Google type | OSM amenity/healthcare value)
  if (set.has("dentist") || set.has("dental_clinic")) return "cabinet_dentaire";
  if (set.has("pharmacy") || set.has("drugstore")) return "pharmacie";
  if (set.has("hospital")) return "hopital";
  if (set.has("medical_lab") || set.has("laboratory")) return "laboratoire";
  if (set.has("optician") || set.has("optometrist")) return "optique";
  if (set.has("birthing_centre") || set.has("midwife")) return "maternite";
  if (set.has("physiotherapist") || set.has("doctor") || set.has("doctors")) return "cabinet";
  if (set.has("clinic")) return "clinique";
  if (set.has("health") || set.has("hospital_department") || set.has("centre")) return "centre_sante";
  return null;
}

const NAME_RULES: { re: RegExp; category: FacilityCategory }[] = [
  // NB: no trailing \b after accented endings (é/è) — JS \b is ASCII-only and
  // would fail to match "…santé"/"…maternité".
  { re: /\bpharmacie|officine\b/i, category: "pharmacie" },
  { re: /\bh[oô]pital|chu|chn|chr\b/i, category: "hopital" },
  { re: /\bposte de sant[eé]/i, category: "poste_sante" },
  { re: /\b(?:centre|case) de sant[eé]/i, category: "centre_sante" },
  { re: /\bmaternit[eé]/i, category: "maternite" },
  { re: /\blaboratoire|labo|analyses?\b/i, category: "laboratoire" },
  { re: /\bimagerie|radiologie|scanner|irm\b/i, category: "imagerie" },
  { re: /\bdentaire|dentiste|odonto\b/i, category: "cabinet_dentaire" },
  { re: /\boptique|opticien|lunetterie\b/i, category: "optique" },
  { re: /\bclinique\b/i, category: "clinique" },
  { re: /\bcabinet\b/i, category: "cabinet" },
  { re: /\bdialyse|oncolog|cardiolog|centre sp[eé]cialis/i, category: "centre_specialise" },
];

/** Best-effort category from a structure's name (import fallback + backfill). */
export function inferCategoryFromName(name: string | undefined | null): FacilityCategory {
  if (!name) return "autre";
  for (const { re, category } of NAME_RULES) {
    if (re.test(name)) return category;
  }
  return "autre";
}

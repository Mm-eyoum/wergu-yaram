/**
 * Per-type search filter configuration.
 *
 * Declares, for each content type, the faceted filter groups and sort options
 * shown on the /recherche page, plus pure helpers to derive option lists (with
 * counts), apply the active filters, and sort the resulting hits. The page wires
 * these into FilterSidebar and keeps the selected state in the URL query string.
 */
import type { SearchFacets, SearchHit } from "@/types/domain";
import type { SearchScope } from "@/services/content";
import {
  AWARE_LABELS,
  EVENT_MODES,
  NEED_STATUS_LABELS,
  PARTNER_CATEGORY_LABELS,
  SENEGAL_REGIONS,
  URGENCY_LABELS,
} from "@/lib/constants";

export type FacetKey = keyof SearchFacets;

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export type FilterKind = "radio" | "checkbox" | "toggle" | "select";

export interface FilterGroup {
  /** State + URL param key. */
  key: string;
  /** Displayed group title. */
  title: string;
  kind: FilterKind;
  options: FilterOption[];
}

/** One facet filter definition for a content type. */
interface FacetFilterDef {
  /** State + URL param key (e.g. "famille"). */
  param: string;
  label: string;
  facetKey: FacetKey;
  kind: "select" | "multi" | "toggle";
  /** Static option list (enums). Omit ⇒ options derived from the result set. */
  options?: FilterOption[];
}

export interface SortDef {
  value: string;
  label: string;
}

interface TypeFilterConfig {
  facets: FacetFilterDef[];
  sorts: SortDef[];
  /** Whether the global "Fiabilité" (verified) group applies to this type. */
  reliability: boolean;
}

// Labels below are i18n keys (namespace-qualified, "filters:…"), resolved at
// render by buildFacetGroups / the page (see translateGroupLabels). Region/city
// option labels stay raw data (proper nouns) and pass through untranslated.
const SORT_RELEVANCE: SortDef = { value: "relevance", label: "filters:sorts.relevance" };
const SORT_TITLE: SortDef = { value: "title", label: "filters:sorts.title" };
const DEFAULT_SORTS: SortDef[] = [SORT_RELEVANCE, SORT_TITLE];

const REGION_OPTIONS: FilterOption[] = SENEGAL_REGIONS.slice(1).map((r) => ({
  value: r,
  label: r,
}));

const AWARE_OPTIONS: FilterOption[] = (
  Object.keys(AWARE_LABELS) as (keyof typeof AWARE_LABELS)[]
).map((k) => ({ value: k, label: `filters:options.aware.${k}` }));

const URGENCY_OPTIONS: FilterOption[] = (
  Object.keys(URGENCY_LABELS) as (keyof typeof URGENCY_LABELS)[]
).map((k) => ({ value: k, label: `filters:options.urgency.${k}` }));

const NEED_STATUS_OPTIONS: FilterOption[] = (
  Object.keys(NEED_STATUS_LABELS) as (keyof typeof NEED_STATUS_LABELS)[]
).map((k) => ({ value: k, label: `filters:options.needStatus.${k}` }));

const MODE_OPTIONS: FilterOption[] = EVENT_MODES.map((m) => ({ value: m, label: `filters:options.mode.${m}` }));

const PARTNER_CATEGORY_OPTIONS: FilterOption[] = (
  Object.keys(PARTNER_CATEGORY_LABELS) as (keyof typeof PARTNER_CATEGORY_LABELS)[]
).map((k) => ({ value: k, label: `filters:options.partnerCategory.${k}` }));

/** Filters + sorts available per content type (and the "all" tab). */
export const TYPE_FILTERS: Record<SearchScope, TypeFilterConfig> = {
  all: { facets: [], sorts: DEFAULT_SORTS, reliability: true },
  symptome: { facets: [], sorts: DEFAULT_SORTS, reliability: false },
  medicament: {
    reliability: true,
    sorts: DEFAULT_SORTS,
    facets: [
      { param: "famille", label: "filters:titles.famille", facetKey: "family", kind: "select" },
      { param: "aware", label: "filters:titles.aware", facetKey: "awareCategory", kind: "multi", options: AWARE_OPTIONS },
      { param: "sansord", label: "filters:titles.sansord", facetKey: "withoutPrescription", kind: "toggle" },
      { param: "essentiel", label: "filters:titles.essentiel", facetKey: "essentialMedicine", kind: "toggle" },
    ],
  },
  pathologie: {
    reliability: true,
    sorts: DEFAULT_SORTS,
    facets: [{ param: "categorie", label: "filters:titles.categorie", facetKey: "category", kind: "select" }],
  },
  article: {
    reliability: true,
    sorts: [...DEFAULT_SORTS, { value: "recent", label: "filters:sorts.recent" }],
    facets: [{ param: "categorie", label: "filters:titles.categorie", facetKey: "category", kind: "select" }],
  },
  video: {
    reliability: true,
    sorts: [...DEFAULT_SORTS, { value: "recent", label: "filters:sorts.recent" }],
    facets: [{ param: "categorie", label: "filters:titles.categorie", facetKey: "category", kind: "select" }],
  },
  etablissement: {
    reliability: true,
    sorts: [
      ...DEFAULT_SORTS,
      { value: "rating", label: "filters:sorts.rating" },
      { value: "distance", label: "filters:sorts.distance" },
    ],
    facets: [
      { param: "categorie", label: "filters:titles.categorie", facetKey: "facilityType", kind: "select" },
      { param: "secteur", label: "filters:titles.secteur", facetKey: "sector", kind: "select" },
      { param: "region", label: "filters:titles.region", facetKey: "region", kind: "select", options: REGION_OPTIONS },
      { param: "ville", label: "filters:titles.ville", facetKey: "city", kind: "select" },
      { param: "specialites", label: "filters:titles.specialites", facetKey: "specialties", kind: "multi" },
    ],
  },
  communaute: {
    reliability: false,
    sorts: [...DEFAULT_SORTS, { value: "members", label: "filters:sorts.members" }],
    facets: [
      { param: "theme", label: "filters:titles.theme", facetKey: "topic", kind: "select" },
      { param: "public", label: "filters:titles.public", facetKey: "isPublic", kind: "toggle" },
    ],
  },
  evenement: {
    reliability: false,
    sorts: [...DEFAULT_SORTS, { value: "date", label: "filters:sorts.date" }],
    facets: [
      { param: "mode", label: "filters:titles.mode", facetKey: "mode", kind: "multi", options: MODE_OPTIONS },
      { param: "ville", label: "filters:titles.ville", facetKey: "city", kind: "select" },
    ],
  },
  besoin: {
    reliability: false,
    sorts: [
      ...DEFAULT_SORTS,
      { value: "urgency", label: "filters:sorts.urgency" },
      { value: "daysLeft", label: "filters:sorts.daysLeft" },
    ],
    facets: [
      { param: "urgence", label: "filters:titles.urgence", facetKey: "urgency", kind: "multi", options: URGENCY_OPTIONS },
      { param: "statut", label: "filters:titles.statut", facetKey: "needStatus", kind: "multi", options: NEED_STATUS_OPTIONS },
      { param: "region", label: "filters:titles.region", facetKey: "region", kind: "select", options: REGION_OPTIONS },
    ],
  },
  partenaire: {
    reliability: false,
    sorts: DEFAULT_SORTS,
    facets: [
      { param: "categorie", label: "filters:titles.categorie", facetKey: "partnerCategory", kind: "multi", options: PARTNER_CATEGORY_OPTIONS },
      { param: "zone", label: "filters:titles.zone", facetKey: "zone", kind: "select" },
    ],
  },
  formation: {
    reliability: true,
    sorts: DEFAULT_SORTS,
    facets: [
      { param: "theme", label: "filters:titles.theme", facetKey: "category", kind: "select" },
    ],
  },
};

/** All filter param names used by any type (for cleaning the URL on type change). */
export const ALL_FACET_PARAMS: string[] = Array.from(
  new Set(Object.values(TYPE_FILTERS).flatMap((c) => c.facets.map((f) => f.param))),
);

/** Normalise a facet value to one or more comparable strings. */
function facetValues(hit: SearchHit, key: FacetKey): string[] {
  const v = hit.facets?.[key];
  if (v == null) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

/** Does a single hit satisfy one facet filter? */
function matchesFacet(hit: SearchHit, def: FacetFilterDef, selected: string | string[]): boolean {
  if (def.kind === "toggle") {
    return selected === "1" ? hit.facets?.[def.facetKey] === true : true;
  }
  const values = facetValues(hit, def.facetKey);
  if (def.kind === "multi") {
    const chosen = Array.isArray(selected) ? selected : selected ? [selected] : [];
    if (chosen.length === 0) return true;
    return chosen.some((c) => values.includes(c));
  }
  // select
  const chosen = Array.isArray(selected) ? selected[0] : selected;
  if (!chosen) return true;
  return values.includes(chosen);
}

/**
 * Apply the active facet filters for a type. `exceptParam` skips one group so
 * its option counts reflect the *other* active filters (classic faceting).
 */
export function applyFacets(
  hits: SearchHit[],
  scope: SearchScope,
  selected: Record<string, string | string[]>,
  exceptParam?: string,
): SearchHit[] {
  const defs = TYPE_FILTERS[scope]?.facets ?? [];
  if (defs.length === 0) return hits;
  return hits.filter((hit) =>
    defs.every((def) => {
      if (def.param === exceptParam) return true;
      const sel = selected[def.param];
      if (sel == null || (Array.isArray(sel) && sel.length === 0) || sel === "") return true;
      return matchesFacet(hit, def, sel);
    }),
  );
}

/** Minimal translator shape (react-i18next's TFunction is compatible). */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Build the FilterSidebar groups for a type, with option counts.
 *  `t` resolves the namespaced label keys ("filters:…"); raw data labels
 *  (regions, cities, families…) are passed through unchanged. */
export function buildFacetGroups(
  scope: SearchScope,
  typeHits: SearchHit[],
  selected: Record<string, string | string[]>,
  t: Translate,
): FilterGroup[] {
  // A label is a translation key when namespace-prefixed ("filters:…"); raw
  // data values (region/city names) stay verbatim.
  const tr = (label: string) => (label.startsWith("filters:") ? t(label) : label);
  const defs = TYPE_FILTERS[scope]?.facets ?? [];
  return defs
    .map((def): FilterGroup | null => {
      const title = tr(def.label);
      // Count against the pool filtered by every *other* active facet.
      const pool = applyFacets(typeHits, scope, selected, def.param);

      if (def.kind === "toggle") {
        const count = pool.filter((h) => h.facets?.[def.facetKey] === true).length;
        if (count === 0 && selected[def.param] !== "1") return null;
        return { key: def.param, title, kind: "toggle", options: [{ value: "1", label: title, count }] };
      }

      const counts = new Map<string, number>();
      for (const h of pool) for (const v of facetValues(h, def.facetKey)) counts.set(v, (counts.get(v) ?? 0) + 1);

      let options: FilterOption[];
      if (def.options) {
        options = def.options.map((o) => ({ ...o, label: tr(o.label), count: counts.get(o.value) ?? 0 }));
      } else {
        options = Array.from(counts.entries())
          .map(([value, count]) => ({ value, label: value, count }))
          .sort((a, b) => b.count! - a.count! || a.label.localeCompare(b.label, "fr"));
      }

      const selectedVals = selected[def.param];
      const hasSelection = Array.isArray(selectedVals) ? selectedVals.length > 0 : Boolean(selectedVals);
      if (options.every((o) => o.count === 0) && !hasSelection) return null;

      if (def.kind === "select") {
        return {
          key: def.param,
          title,
          kind: "select",
          options: [{ value: "", label: t("filters:allPrefix", { label: title }) }, ...options],
        };
      }
      return { key: def.param, title, kind: "checkbox", options };
    })
    .filter((g): g is FilterGroup => g !== null);
}

const URGENCY_ORDER: Record<string, number> = { urgent: 0, eleve: 1, modere: 2 };

/**
 * Sort hits per the chosen sort value. `distanceOf` (km, optional) powers the
 * "Plus proches" sort for facility hits — hits without a distance sink last.
 */
export function applySort(
  hits: SearchHit[],
  sortValue: string,
  distanceOf?: (hit: SearchHit) => number | undefined,
): SearchHit[] {
  if (!sortValue || sortValue === "relevance") return hits;
  const sorted = [...hits];
  switch (sortValue) {
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title, "fr"));
    case "rating":
      return sorted.sort((a, b) => (b.facets?.rating ?? 0) - (a.facets?.rating ?? 0));
    case "members":
      return sorted.sort((a, b) => (b.facets?.membersCount ?? 0) - (a.facets?.membersCount ?? 0));
    case "daysLeft":
      return sorted.sort((a, b) => (a.facets?.daysLeft ?? Infinity) - (b.facets?.daysLeft ?? Infinity));
    case "urgency":
      return sorted.sort(
        (a, b) =>
          (URGENCY_ORDER[a.facets?.urgency ?? ""] ?? 99) - (URGENCY_ORDER[b.facets?.urgency ?? ""] ?? 99),
      );
    case "date":
      return sorted.sort((a, b) => (a.facets?.startAt ?? "").localeCompare(b.facets?.startAt ?? ""));
    case "recent":
      return sorted.sort((a, b) => (b.facets?.publishedAt ?? "").localeCompare(a.facets?.publishedAt ?? ""));
    case "distance":
      if (!distanceOf) return sorted;
      return sorted.sort((a, b) => (distanceOf(a) ?? Infinity) - (distanceOf(b) ?? Infinity));
    default:
      return sorted;
  }
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, Map as MapIcon } from "lucide-react";
import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { FilterSidebar, type FilterGroup } from "@/components/search/FilterSidebar";
import {
  TYPE_FILTERS,
  ALL_FACET_PARAMS,
  buildFacetGroups,
  applyFacets,
  applySort,
} from "@/lib/searchFilters";
import { ResultCard } from "@/components/cards/ResultCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { LazyMapView } from "@/components/map/LazyMapView";
import type { MapMarker } from "@/components/map/MapView";
import { MarkerPopup } from "@/components/map/MarkerPopup";
import { SEARCH_TYPES } from "@/lib/constants";
import type { SearchScope } from "@/services/content";
import { useSearch } from "@/hooks/useSearch";
import { usePagination } from "@/hooks/usePagination";
import { useFacilities } from "@/hooks/useCatalog";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineKm, formatDistance } from "@/lib/geo";
import { fetchActiveOrganizations } from "@/services/organizations";
import { orgToSearchHit } from "@/lib/orgAdapters";
import { SaveSearchButton } from "@/components/content/SaveSearchButton";
import { SEOHead } from "@/seo/SEOHead";

const RELIABILITY_GROUP: FilterGroup = {
  key: "reliability",
  title: "Fiabilité",
  kind: "radio",
  options: [
    { value: "all", label: "Tous les contenus" },
    { value: "verified", label: "Contenus vérifiés" },
  ],
};

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const typeParam = (params.get("type") as SearchScope | null) ?? "all";
  const config = TYPE_FILTERS[typeParam] ?? TYPE_FILTERS.all;

  const { data: catalogHits = [], isLoading } = useSearch(query);
  const { data: facilities = [] } = useFacilities();
  const { data: activeOrgs = [] } = useQuery({
    queryKey: ["activeOrgs"],
    queryFn: fetchActiveOrganizations,
  });
  const geo = useGeolocation();
  const [view, setView] = useState<"grid" | "map">("grid");
  const isFacilityTab = typeParam === "etablissement";

  // Directory orgs (facilities + partners) as hits, filtered by the query terms.
  const orgHits = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return activeOrgs.map(orgToSearchHit).filter((h) => {
      if (terms.length === 0) return true;
      const hay = `${h.title} ${h.keywords} ${h.meta ?? ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [activeOrgs, query]);

  const allHits = useMemo(() => [...catalogHits, ...orgHits], [catalogHits, orgHits]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allHits.length };
    for (const hit of allHits) c[hit.type] = (c[hit.type] ?? 0) + 1;
    return c;
  }, [allHits]);

  // Hits restricted to the active type tab (before facet/reliability filters).
  const typeHits = useMemo(
    () => (typeParam === "all" ? allHits : allHits.filter((h) => h.type === typeParam)),
    [allHits, typeParam],
  );

  // Filter selections read from the URL: `fiabilite`, `tri`, and one param per
  // facet (multi-value facets stored comma-separated).
  const selected = useMemo(() => {
    const s: Record<string, string | string[]> = {
      reliability: params.get("fiabilite") ?? "all",
      sort: params.get("tri") ?? "relevance",
    };
    for (const def of config.facets) {
      const raw = params.get(def.param);
      s[def.param] = def.kind === "multi" ? (raw ? raw.split(",").filter(Boolean) : []) : (raw ?? "");
    }
    return s;
  }, [params, config]);

  // Coordinates by hit key (facility slug or org id) for the "Plus proches" sort.
  const coordsByKey = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number }>();
    for (const f of facilities) m.set(f.slug, f.coords);
    for (const o of activeOrgs) if (o.coords) m.set(o.id, o.coords);
    return m;
  }, [facilities, activeOrgs]);

  const results = useMemo(() => {
    let hits = typeHits;
    if (selected.reliability === "verified") hits = hits.filter((h) => h.verified);
    hits = applyFacets(hits, typeParam, selected);
    const distanceOf = (hit: (typeof hits)[number]) => {
      if (!geo.position) return undefined;
      const c = coordsByKey.get(hit.href.split("/").pop() ?? "");
      return c ? haversineKm(geo.position, c) : undefined;
    };
    return applySort(hits, String(selected.sort), distanceOf);
  }, [typeHits, typeParam, selected, geo.position, coordsByKey]);

  // Filter sidebar groups: reliability (when relevant) + per-type facets + sort.
  const filterGroups = useMemo<FilterGroup[]>(() => {
    const groups: FilterGroup[] = [];
    if (config.reliability) groups.push(RELIABILITY_GROUP);
    groups.push(...buildFacetGroups(typeParam, typeHits, selected));
    const sorts = config.sorts.filter((s) => s.value !== "distance" || geo.position);
    groups.push({
      key: "sort",
      title: "Trier par",
      kind: "radio",
      options: sorts.map((s) => ({ value: s.value, label: s.label })),
    });
    return groups;
  }, [config, typeParam, typeHits, selected, geo.position]);

  function changeFilter(key: string, value: string | string[]) {
    const next = new URLSearchParams(params);
    const param = key === "reliability" ? "fiabilite" : key === "sort" ? "tri" : key;
    const isDefault =
      (key === "reliability" && value === "all") ||
      (key === "sort" && value === "relevance") ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    if (Array.isArray(value)) {
      if (value.length) next.set(param, value.join(","));
      else next.delete(param);
    } else if (isDefault) next.delete(param);
    else next.set(param, value);
    setParams(next);
  }

  function resetFilters() {
    const next = new URLSearchParams(params);
    for (const p of [...ALL_FACET_PARAMS, "fiabilite", "tri"]) next.delete(p);
    setParams(next);
  }

  // Recover coordinates for facility hits: catalog facilities by slug, directory
  // orgs by their /structures/:id doc id.
  const facilityMarkers: MapMarker[] = useMemo(() => {
    if (!isFacilityTab) return [];
    const bySlug = new Map(facilities.map((f) => [f.slug, f]));
    const orgById = new Map(
      activeOrgs.filter((o) => o.type === "healthcare_facility" && o.coords).map((o) => [o.id, o]),
    );
    const dist = (c: { lat: number; lng: number }) =>
      geo.position ? `à ${formatDistance(haversineKm(geo.position, c))}` : undefined;
    return results.flatMap((hit): MapMarker[] => {
      const key = hit.href.split("/").pop() ?? "";
      const f = bySlug.get(key);
      if (f) {
        return [
          {
            id: f.slug,
            coords: f.coords,
            title: f.name,
            popup: (
              <MarkerPopup
                title={f.name}
                subtitle={`${f.type} · ${f.city}`}
                distanceLabel={dist(f.coords)}
                href={hit.href}
                coords={f.coords}
              />
            ),
          },
        ];
      }
      const o = orgById.get(key);
      if (o?.coords) {
        return [
          {
            id: o.id,
            coords: o.coords,
            color: o.claimStatus === "claimed" ? "green" : "amber",
            title: o.name,
            popup: (
              <MarkerPopup
                title={o.name}
                subtitle={o.claimStatus === "claimed" ? o.city : "Non réclamée"}
                distanceLabel={dist(o.coords)}
                href={hit.href}
                coords={o.coords}
              />
            ),
          },
        ];
      }
      return [];
    });
  }, [isFacilityTab, facilities, activeOrgs, results, geo.position]);

  const tabs: TabItem[] = SEARCH_TYPES.map((t) => ({
    key: t.key,
    label: t.label,
    count: counts[t.key] ?? 0,
  }));

  function changeType(key: string) {
    const next = new URLSearchParams(params);
    if (key === "all") next.delete("type");
    else next.set("type", key);
    // Facets/sort/reliability are type-specific — drop stale ones on tab change.
    for (const p of [...ALL_FACET_PARAMS, "fiabilite", "tri"]) next.delete(p);
    setParams(next);
  }

  const { paged, hasMore, remaining, showMore } = usePagination(results);

  const hasActiveFilters =
    typeParam !== "all" ||
    selected.reliability !== "all" ||
    selected.sort !== "relevance" ||
    config.facets.some((def) => {
      const v = selected[def.param];
      return Array.isArray(v) ? v.length > 0 : Boolean(v);
    });

  function resetSearch() {
    const next = new URLSearchParams(params);
    next.delete("type");
    for (const p of [...ALL_FACET_PARAMS, "fiabilite", "tri"]) next.delete(p);
    setParams(next);
  }

  return (
    <>
      <SEOHead
        title={query ? `Recherche : ${query}` : "Recherche santé"}
        description="Recherchez médicaments, pathologies, articles, établissements et communautés sur Wergu Yaram."
        noIndex
      />
      <UniversalSearchHero
        compact
        showShortcuts={false}
        defaultValue={query}
        subtitle="Affinez votre recherche par type de contenu et par fiabilité."
      />

      <div className="container-page py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">
            {query ? (
              <>
                <span className="font-semibold text-text-primary">{results.length}</span> résultat
                {results.length > 1 ? "s" : ""} pour «{" "}
                <span className="font-semibold text-text-primary">{query}</span> »
              </>
            ) : (
              <>Parcourez l'ensemble des contenus de la plateforme.</>
            )}
          </p>
          <div className="flex items-center gap-2">
            {isFacilityTab && (
              <div className="inline-flex overflow-hidden rounded-xl border border-border-soft">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  aria-pressed={view === "grid"}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold ${view === "grid" ? "bg-brand-green text-white" : "bg-white text-text-secondary hover:text-brand-green"}`}
                >
                  <LayoutGrid className="h-4 w-4" /> Liste
                </button>
                <button
                  type="button"
                  onClick={() => setView("map")}
                  aria-pressed={view === "map"}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold ${view === "map" ? "bg-brand-green text-white" : "bg-white text-text-secondary hover:text-brand-green"}`}
                >
                  <MapIcon className="h-4 w-4" /> Carte
                </button>
              </div>
            )}
            {query.trim() && <SaveSearchButton query={query} scope={typeParam} />}
          </div>
        </div>

        <Tabs items={tabs} active={typeParam} onChange={changeType} className="mb-6" />

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <FilterSidebar
            groups={filterGroups}
            selected={selected}
            onChange={changeFilter}
            onReset={resetFilters}
          />

          <div>
            {isLoading ? (
              <LoadingState label="Recherche en cours…" />
            ) : results.length === 0 ? (
              <EmptyState
                title="Aucun résultat"
                message="Essayez un autre mot-clé, élargissez la catégorie ou réinitialisez vos filtres."
                action={
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={resetSearch}>
                        Réinitialiser les filtres
                      </Button>
                    )}
                    <ButtonLink to="/recherche?type=pathologie" size="sm">
                      Explorer les pathologies
                    </ButtonLink>
                  </div>
                }
              />
            ) : isFacilityTab && view === "map" ? (
              facilityMarkers.length > 0 ? (
                <LazyMapView
                  className="h-[65vh] w-full"
                  markers={facilityMarkers}
                  userCoords={geo.position}
                  center={geo.position ?? undefined}
                  clustering
                  fitToMarkers={!geo.position}
                />
              ) : (
                <EmptyState
                  title="Localisation indisponible"
                  message="Ces structures n'ont pas encore de coordonnées géographiques."
                />
              )
            ) : (
              <div className="space-y-4">
                {paged.map((hit) => (
                  <ResultCard key={hit.id} hit={hit} />
                ))}
                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" onClick={showMore}>
                      Voir plus ({remaining})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { FilterSidebar, type FilterGroup } from "@/components/search/FilterSidebar";
import { ResultCard } from "@/components/cards/ResultCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SEARCH_TYPES } from "@/lib/constants";
import { searchContent, searchCounts, type SearchScope } from "@/services/content";

const FILTER_GROUPS: FilterGroup[] = [
  {
    title: "Fiabilité",
    options: [
      { value: "all", label: "Tous les contenus" },
      { value: "verified", label: "Contenus vérifiés" },
    ],
  },
  {
    title: "Trier par",
    options: [
      { value: "relevance", label: "Pertinence" },
      { value: "title", label: "Ordre alphabétique" },
    ],
  },
];

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const typeParam = (params.get("type") as SearchScope | null) ?? "all";

  const [filters, setFilters] = useState<Record<string, string>>({
    Fiabilité: "all",
    "Trier par": "relevance",
  });

  const counts = useMemo(() => searchCounts(query), [query]);

  const results = useMemo(() => {
    let hits = searchContent(query, typeParam);
    if (filters["Fiabilité"] === "verified") hits = hits.filter((h) => h.verified);
    if (filters["Trier par"] === "title") {
      hits = [...hits].sort((a, b) => a.title.localeCompare(b.title, "fr"));
    }
    return hits;
  }, [query, typeParam, filters]);

  const tabs: TabItem[] = SEARCH_TYPES.map((t) => ({
    key: t.key,
    label: t.label,
    count: counts[t.key] ?? 0,
  }));

  function changeType(key: string) {
    const next = new URLSearchParams(params);
    if (key === "all") next.delete("type");
    else next.set("type", key);
    setParams(next);
  }

  return (
    <>
      <UniversalSearchHero
        compact
        showShortcuts={false}
        defaultValue={query}
        subtitle="Affinez votre recherche par type de contenu et par fiabilité."
      />

      <div className="container-page py-8">
        <p className="mb-4 text-sm text-text-secondary">
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

        <Tabs items={tabs} active={typeParam} onChange={changeType} className="mb-6" />

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <FilterSidebar
            groups={FILTER_GROUPS}
            selected={filters}
            onChange={(group, value) => setFilters((f) => ({ ...f, [group]: value }))}
            onReset={() => setFilters({ Fiabilité: "all", "Trier par": "relevance" })}
          />

          <div>
            {results.length === 0 ? (
              <EmptyState
                title="Aucun résultat"
                message="Essayez un autre mot-clé ou changez de catégorie."
              />
            ) : (
              <div className="space-y-4">
                {results.map((hit) => (
                  <ResultCard key={hit.id} hit={hit} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

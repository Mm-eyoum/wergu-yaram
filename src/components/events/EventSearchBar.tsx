import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SENEGAL_REGIONS } from "@/lib/constants";

/**
 * Recherche d'événements (mot-clé + ville/région), façon bandeau Eventbrite,
 * adaptée à la charte. Contrôlée par le parent (filtrage client-side).
 */
export function EventSearchBar({
  query,
  region,
  onQuery,
  onRegion,
}: {
  query: string;
  region: string;
  onQuery: (v: string) => void;
  onRegion: (v: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="mx-auto flex max-w-2xl flex-col gap-2 rounded-2xl border border-border-soft bg-white p-2 shadow-soft sm:flex-row"
    >
      <label className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Rechercher un événement, un thème…"
          aria-label="Rechercher un événement"
          className="h-11 w-full rounded-xl border-0 bg-transparent pl-9 pr-3 text-sm focus:outline-none"
        />
      </label>
      <label className="relative sm:w-52">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <select
          value={region}
          onChange={(e) => onRegion(e.target.value)}
          aria-label="Filtrer par région"
          className="h-11 w-full rounded-xl border border-border-soft bg-white pl-9 pr-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
        >
          {SENEGAL_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="lg" className="shrink-0">
        <Search className="h-4 w-4" /> Rechercher
      </Button>
    </form>
  );
}

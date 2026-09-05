import { useEffect, useMemo, useState } from "react";
import { LayoutList, LocateFixed, Map as MapIcon, MapPinned, Search } from "lucide-react";
import { LazyMapView } from "@/components/map/LazyMapView";
import type { MapMarker } from "@/components/map/MapView";
import { MarkerPopup } from "@/components/map/MarkerPopup";
import { MapListItem } from "@/components/map/MapListItem";
import { MapLegend } from "@/components/map/MapLegend";
import type { PinColor } from "@/components/map/leafletSetup";
import { CategoryPill } from "@/components/ui/CategoryPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useFacilities } from "@/hooks/useCatalog";
import { useGeolocation } from "@/hooks/useGeolocation";
import { SENEGAL_REGIONS } from "@/lib/constants";
import { categoryLabel, CATEGORY_OPTIONS } from "@/lib/facilityTaxonomy";
import { haversineKm, formatDistance } from "@/lib/geo";
import type { Coords } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

interface Entry {
  id: string;
  name: string;
  meta: string;
  color: PinColor;
  category?: string;
  amber?: boolean;
  badge?: string;
  href: string;
  coords: Coords;
  source: "catalog" | "org";
  region: string;
  city: string;
  /** Paid Pro page — promoted to the top of the list. */
  featured?: boolean;
  d?: number;
}

const TYPES = [
  { key: "all", label: "Tous" },
  { key: "catalog", label: "Établissements" },
  { key: "org", label: "Annuaire" },
] as const;

/** Discovery: synced list + map of all health structures, with filters & "near me". */
export default function Carte() {
  const { data: facilities = [], isLoading } = useFacilities();
  const geo = useGeolocation();

  const [region, setRegion] = useState(SENEGAL_REGIONS[0]);
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("all");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("list");

  const entriesAll: Entry[] = useMemo(() => {
    // Every health establishment lives in `facilities`. An imported, still
    // unclaimed listing shows as "Annuaire" (amber); everything else is "catalog".
    return facilities
      .filter((f) => f.coords)
      .map((f) => {
        const unclaimed = f.source === "imported" && f.claimStatus !== "claimed" && !f.ownerUid;
        return {
          id: `f:${f.slug}`,
          name: f.name,
          meta: unclaimed
            ? `${categoryLabel(f.category) || "Établissement"} · Non réclamée`
            : `${categoryLabel(f.category) || f.type || "Établissement"} · ${f.city}`,
          color: unclaimed ? "amber" : "green",
          category: f.category,
          amber: unclaimed,
          badge: f.planTier ? "Vérifié" : unclaimed ? "Annuaire" : undefined,
          featured: Boolean(f.featured),
          href: `/etablissements/${f.slug}`,
          coords: f.coords,
          source: unclaimed ? "org" : "catalog",
          region: f.region,
          city: f.city,
        };
      });
  }, [facilities]);

  const entries = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = entriesAll.filter((e) => {
      if (region !== SENEGAL_REGIONS[0] && e.region !== region) return false;
      if (type !== "all" && e.source !== type) return false;
      if (category && e.category !== category) return false;
      if (term && !`${e.name} ${e.city}`.toLowerCase().includes(term)) return false;
      return true;
    });
    if (geo.position) {
      list = list.map((e) => ({ ...e, d: haversineKm(geo.position!, e.coords) }));
    }
    // Featured (Pro) pages first, then by distance when geolocated.
    list = [...list].sort((a, b) => {
      const f = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (f !== 0) return f;
      return (a.d ?? 0) - (b.d ?? 0);
    });
    return list;
  }, [entriesAll, region, type, category, q, geo.position]);

  const markers: MapMarker[] = useMemo(
    () =>
      entries.map((e) => ({
        id: e.id,
        coords: e.coords,
        color: e.color,
        category: e.category,
        amber: e.amber,
        glyph: "hospital",
        title: e.name,
        popup: (
          <MarkerPopup
            title={e.name}
            subtitle={e.meta}
            distanceLabel={e.d != null ? `à ${formatDistance(e.d)}` : undefined}
            href={e.href}
            coords={e.coords}
          />
        ),
      })),
    [entries],
  );

  // When a pin is clicked, scroll its list row into view.
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`mli-${selectedId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <div className="container-page py-6">
      <SEOHead
        title="Carte des structures de santé"
        description="Explorez les hôpitaux, cliniques et centres de santé du Sénégal sur une carte interactive."
      />

      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <MapPinned className="h-6 w-6 text-brand-green" /> Carte des structures
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {entries.length} structure{entries.length > 1 ? "s" : ""}
            {region !== SENEGAL_REGIONS[0] ? ` · ${region}` : ""}
          </p>
        </div>
        {/* Mobile view toggle */}
        <div className="inline-flex overflow-hidden rounded-xl border border-border-soft lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView("list")}
            aria-pressed={mobileView === "list"}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold ${mobileView === "list" ? "bg-brand-green text-white" : "bg-white text-text-secondary"}`}
          >
            <LayoutList className="h-4 w-4" /> Liste
          </button>
          <button
            type="button"
            onClick={() => setMobileView("map")}
            aria-pressed={mobileView === "map"}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold ${mobileView === "map" ? "bg-brand-green text-white" : "bg-white text-text-secondary"}`}
          >
            <MapIcon className="h-4 w-4" /> Carte
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* --- Left: filters + list --- */}
        <div className={`${mobileView === "map" ? "hidden" : "block"} lg:block`}>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher une structure…"
                className="h-11 w-full rounded-xl border border-border-soft bg-white pl-10 pr-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <CategoryPill key={t.key} label={t.label} active={type === t.key} onClick={() => setType(t.key)} />
              ))}
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              <option value="">Toutes les catégories</option>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="h-11 flex-1 rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
              >
                {SENEGAL_REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={geo.request}
                title="Trier autour de moi"
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border-soft bg-white px-3 text-sm font-semibold text-text-primary hover:border-brand-teal hover:text-brand-green"
              >
                <LocateFixed className="h-4 w-4" /> Autour
              </button>
            </div>
          </div>

          {geo.error && <p className="mt-2 text-xs text-text-secondary">{geo.error}</p>}

          <div className="mt-3 max-h-[64vh] space-y-2 overflow-y-auto scroll-thin pr-1">
            {isLoading ? (
              <LoadingState label="Chargement…" />
            ) : entries.length === 0 ? (
              <EmptyState title="Aucune structure" message="Ajustez la recherche, le type ou la région." />
            ) : (
              entries.map((e) => (
                <div key={e.id} id={`mli-${e.id}`}>
                  <MapListItem
                    name={e.name}
                    meta={e.meta}
                    distanceLabel={e.d != null ? `à ${formatDistance(e.d)}` : undefined}
                    color={e.color}
                    badge={e.badge}
                    href={e.href}
                    coords={e.coords}
                    active={selectedId === e.id || hoveredId === e.id}
                    onHover={() => setHoveredId(e.id)}
                    onLeave={() => setHoveredId(null)}
                    onSelect={() => setSelectedId(e.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- Right: map --- */}
        <div className={`${mobileView === "list" ? "hidden" : "block"} relative lg:block`}>
          <div className="lg:sticky lg:top-20">
            <LazyMapView
              className="h-[64vh] w-full lg:h-[78vh]"
              markers={markers}
              userCoords={geo.position}
              center={geo.position ?? undefined}
              clustering
              fitToMarkers={!geo.position && !selectedId}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onMarkerClick={setSelectedId}
              onLocate={geo.request}
            />
            <MapLegend />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LocateFixed, MapPinned } from "lucide-react";
import { LazyMapView } from "@/components/map/LazyMapView";
import type { MapMarker } from "@/components/map/MapView";
import { MarkerPopup } from "@/components/map/MarkerPopup";
import { LoadingState } from "@/components/ui/LoadingState";
import { useFacilities } from "@/hooks/useCatalog";
import { useGeolocation } from "@/hooks/useGeolocation";
import { fetchActiveFacilityOrganizations } from "@/services/organizations";
import { SENEGAL_REGIONS } from "@/lib/constants";
import { haversineKm, formatDistance } from "@/lib/geo";
import { SEOHead } from "@/seo/SEOHead";

/** Full-page discovery map of all health facilities, with region filter & "near me". */
export default function Carte() {
  const { data: facilities = [], isLoading } = useFacilities();
  // Directory pages (user-created + imported) that carry coordinates.
  const { data: orgs = [] } = useQuery({
    queryKey: ["mapFacilityOrgs"],
    queryFn: fetchActiveFacilityOrganizations,
  });
  const geo = useGeolocation();
  const [region, setRegion] = useState(SENEGAL_REGIONS[0]);

  const filteredFacilities = useMemo(
    () => facilities.filter((f) => region === SENEGAL_REGIONS[0] || f.region === region),
    [facilities, region],
  );
  const filteredOrgs = useMemo(
    () => orgs.filter((o) => region === SENEGAL_REGIONS[0] || o.region === region),
    [orgs, region],
  );

  const markers: MapMarker[] = useMemo(() => {
    const dist = (c: { lat: number; lng: number }) =>
      geo.position ? `à ${formatDistance(haversineKm(geo.position, c))}` : undefined;
    const fromCatalog: MapMarker[] = filteredFacilities.map((f) => ({
      id: f.slug,
      coords: f.coords,
      title: f.name,
      popup: (
        <MarkerPopup
          title={f.name}
          subtitle={`${f.type} · ${f.city}`}
          distanceLabel={dist(f.coords)}
          href={`/etablissements/${f.slug}`}
          coords={f.coords}
        />
      ),
    }));
    const fromOrgs: MapMarker[] = filteredOrgs.map((o) => ({
      id: o.id,
      coords: o.coords!,
      color: o.claimStatus === "claimed" ? "green" : "amber",
      title: o.name,
      popup: (
        <MarkerPopup
          title={o.name}
          subtitle={o.claimStatus === "claimed" ? o.city : "Non réclamée"}
          distanceLabel={dist(o.coords!)}
          href={`/structures/${o.id}`}
          coords={o.coords!}
        />
      ),
    }));
    return [...fromCatalog, ...fromOrgs];
  }, [filteredFacilities, filteredOrgs, geo.position]);

  const filtered = markers;

  return (
    <div className="container-page py-6">
      <SEOHead
        title="Carte des structures de santé"
        description="Explorez les hôpitaux, cliniques et centres de santé du Sénégal sur une carte interactive."
      />

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <MapPinned className="h-6 w-6 text-brand-green" /> Carte des structures
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {filtered.length} structure{filtered.length > 1 ? "s" : ""} affichée
            {filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-11 rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
          >
            {SENEGAL_REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={geo.request}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border-soft bg-white px-3 text-sm font-semibold text-text-primary hover:border-brand-teal hover:text-brand-green"
          >
            <LocateFixed className="h-4 w-4" /> Autour de moi
          </button>
        </div>
      </header>

      {geo.error && <p className="mb-3 text-sm text-text-secondary">{geo.error}</p>}

      {isLoading ? (
        <LoadingState label="Chargement de la carte…" />
      ) : (
        <LazyMapView
          className="h-[70vh] w-full"
          markers={markers}
          userCoords={geo.position}
          center={geo.position ?? undefined}
          clustering
          fitToMarkers={!geo.position}
        />
      )}
    </div>
  );
}

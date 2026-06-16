import { useMemo, useState } from "react";
import { HandHeart, LayoutGrid, Map as MapIcon, Receipt, ShieldCheck, TrendingUp } from "lucide-react";
import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { EquipmentNeedCard } from "@/components/cards/EquipmentNeedCard";
import { CategoryPill } from "@/components/ui/CategoryPill";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { LazyMapView } from "@/components/map/LazyMapView";
import type { MapMarker } from "@/components/map/MapView";
import { MarkerPopup } from "@/components/map/MarkerPopup";
import { useEquipmentNeeds, useFacilities } from "@/hooks/useCatalog";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/Button";
import { SENEGAL_REGIONS } from "@/lib/constants";
import type { Urgency } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

const URGENCIES: { key: Urgency | "all"; label: string }[] = [
  { key: "all", label: "Toutes urgences" },
  { key: "urgent", label: "Urgent" },
  { key: "eleve", label: "Priorité élevée" },
  { key: "modere", label: "Modéré" },
];

export default function EquipmentList() {
  const { data: equipmentNeeds = [], isLoading } = useEquipmentNeeds();
  const { data: facilities = [] } = useFacilities();
  const [region, setRegion] = useState("Toutes les régions");
  const [urgency, setUrgency] = useState<Urgency | "all">("all");
  const [view, setView] = useState<"grid" | "map">("grid");

  const categories = useMemo(
    () => ["Toutes catégories", ...Array.from(new Set(equipmentNeeds.map((n) => n.category)))],
    [equipmentNeeds],
  );
  const [category, setCategory] = useState("Toutes catégories");

  const filtered = useMemo(
    () =>
      equipmentNeeds.filter(
        (n) =>
          (region === "Toutes les régions" || n.region === region) &&
          (urgency === "all" || n.urgency === urgency) &&
          (category === "Toutes catégories" || n.category === category),
      ),
    [equipmentNeeds, region, urgency, category],
  );

  const { paged, hasMore, remaining, showMore } = usePagination(filtered);

  // Resolve each need's coordinates via its beneficiary facility for the map view.
  const needMarkers: MapMarker[] = useMemo(() => {
    const bySlug = new Map(facilities.map((f) => [f.slug, f]));
    return filtered.flatMap((n): MapMarker[] => {
      const f = bySlug.get(n.facilitySlug);
      if (!f) return [];
      return [
        {
          id: n.id,
          coords: f.coords,
          color: n.urgency === "urgent" ? "amber" : "green",
          title: n.title,
          popup: (
            <MarkerPopup
              title={n.title}
              subtitle={`${n.facilityName} · ${n.region}`}
              href={`/besoins/${n.id}`}
              coords={f.coords}
            />
          ),
        },
      ];
    });
  }, [facilities, filtered]);

  return (
    <div>
      <SEOHead
        title="Besoins d'équipement médical"
        description="Soutenez les structures de santé du Sénégal en finançant des équipements médicaux essentiels. Chaque don a un impact concret."
        canonicalPath="/besoins"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Besoins", path: "/besoins" },
        ])}
      />
      <UniversalSearchHero
        compact
        showShortcuts={false}
        title={
          <>
            Besoins d'équipement <span className="text-brand-green">prioritaires</span>
          </>
        }
        subtitle="Soutenez les structures de santé du Sénégal en finançant des équipements essentiels."
      />

      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_300px]">
        <div>
          {/* Filters */}
          <div className="card-surface mb-6 space-y-4 p-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Région</p>
              <div className="flex flex-wrap gap-2">
                {SENEGAL_REGIONS.slice(0, 6).map((r) => (
                  <CategoryPill key={r} label={r} active={region === r} onClick={() => setRegion(r)} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Urgence</p>
              <div className="flex flex-wrap gap-2">
                {URGENCIES.map((u) => (
                  <CategoryPill key={u.key} label={u.label} active={urgency === u.key} onClick={() => setUrgency(u.key)} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Catégorie</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <CategoryPill key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              {filtered.length} besoin{filtered.length > 1 ? "s" : ""}
            </p>
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
          </div>

          {isLoading ? (
            <LoadingState label="Chargement des besoins…" />
          ) : filtered.length === 0 ? (
            <EmptyState title="Aucun besoin" message="Aucun besoin ne correspond à ces filtres." />
          ) : view === "map" ? (
            <LazyMapView className="h-[60vh] w-full" markers={needMarkers} clustering fitToMarkers />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                {paged.map((need) => (
                  <EquipmentNeedCard key={need.id} need={need} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <Button variant="outline" onClick={showMore}>
                    Voir plus ({remaining})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Impact sidebar */}
        <aside className="space-y-5">
          <div className="card-surface bg-brand-navy p-5 text-white">
            <HandHeart className="h-8 w-8 text-brand-teal" />
            <h2 className="mt-2 text-lg font-bold">Pourquoi soutenir ?</h2>
            <p className="mt-1 text-sm text-white/80">
              Chaque contribution, même modeste, aide une structure à mieux soigner sa communauté.
            </p>
          </div>

          <SidebarPanel title="Notre impact">
            <ul className="space-y-3 text-sm">
              <Impact icon={<TrendingUp className="h-4 w-4" />} label="Fonds collectés" value="2,6 Mds FCFA" />
              <Impact icon={<HandHeart className="h-4 w-4" />} label="Besoins financés" value="320+" />
              <Impact icon={<ShieldCheck className="h-4 w-4" />} label="Transparence" value="100 %" />
            </ul>
          </SidebarPanel>

          <SidebarPanel title="Nos engagements" icon={<Receipt className="h-4 w-4" />}>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" /> Paiement 100 % sécurisé</li>
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" /> Reçu de don transparent</li>
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" /> Suivi de l'utilisation des fonds</li>
            </ul>
          </SidebarPanel>
        </aside>
      </div>
    </div>
  );
}

function Impact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-text-secondary">
        <span className="text-brand-green">{icon}</span>
        {label}
      </span>
      <span className="font-bold text-text-primary">{value}</span>
    </li>
  );
}

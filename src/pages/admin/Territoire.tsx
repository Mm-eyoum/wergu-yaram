import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, HeartHandshake, Hospital, Users } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { LazyMapView } from "@/components/map/LazyMapView";
import type { MapMarker } from "@/components/map/MapView";
import { getTerritorialStats } from "@/services/territorial";
import { REGION_CENTROIDS } from "@/lib/senegalRegions";
import { formatFcfa } from "@/lib/format";
import { exportCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/Button";
import { SEOHead } from "@/seo/SEOHead";

/** Institutional territorial dashboard — anonymized KPIs by region + map. */
export default function Territoire() {
  const q = useQuery({ queryKey: ["admin", "territoire"], queryFn: getTerritorialStats });
  const stats = q.data ?? [];

  const totals = useMemo(
    () => stats.reduce((t, r) => ({ needs: t.needs + r.needs, raised: t.raised + r.raised, facilities: t.facilities + r.facilities, donors: t.donors + r.donors }), { needs: 0, raised: 0, facilities: 0, donors: 0 }),
    [stats],
  );

  const markers: MapMarker[] = useMemo(
    () => stats
      .filter((r) => REGION_CENTROIDS[r.region])
      .map((r) => ({
        id: r.region,
        coords: REGION_CENTROIDS[r.region],
        title: r.region,
        popup: (
          <div className="text-sm">
            <p className="font-bold text-text-primary">{r.region}</p>
            <p className="text-text-secondary">{r.needs} besoin(s) · {r.facilities} structure(s)</p>
            <p className="text-text-secondary">{formatFcfa(r.raised)} collectés · {r.donors} donateur(s)</p>
          </div>
        ),
      })),
    [stats],
  );

  return (
    <div className="mx-auto max-w-5xl">
      <SEOHead title="Tableau de bord territorial" noIndex />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Tableau de bord territorial</h1>
          <p className="text-sm text-text-secondary dark:text-white/60">Indicateurs agrégés (anonymisés) par région.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCsv("territoire", stats as unknown as Record<string, unknown>[])} disabled={!stats.length}>
          Export CSV
        </Button>
      </header>

      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState onRetry={q.refetch} />
      ) : stats.length === 0 ? (
        <EmptyState title="Aucune donnée régionale" message="Les indicateurs apparaîtront quand du contenu géolocalisé sera publié." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile icon={<MapPin className="h-5 w-5" />} label="Régions actives" value={String(stats.length)} />
            <Tile icon={<HeartHandshake className="h-5 w-5" />} label="Besoins" value={String(totals.needs)} />
            <Tile icon={<Hospital className="h-5 w-5" />} label="Structures" value={String(totals.facilities)} />
            <Tile icon={<Users className="h-5 w-5" />} label="Fonds collectés" value={formatFcfa(totals.raised)} />
          </div>

          <LazyMapView className="h-[55vh] w-full overflow-hidden rounded-2xl" markers={markers} fitToMarkers />

          <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-brand-soft text-left text-xs uppercase tracking-wide text-text-secondary dark:border-white/10 dark:bg-white/5">
                  <th className="px-4 py-3 font-semibold">Région</th>
                  <th className="px-4 py-3 font-semibold">Besoins</th>
                  <th className="px-4 py-3 font-semibold">Structures</th>
                  <th className="px-4 py-3 font-semibold">Collecté</th>
                  <th className="px-4 py-3 font-semibold">Donateurs</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((r) => (
                  <tr key={r.region} className="border-b border-black/5 last:border-0 dark:border-white/5">
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-white">{r.region}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.needs}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.facilities}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatFcfa(r.raised)}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.donors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-white p-4 dark:bg-white/5">
      <span className="text-brand-green">{icon}</span>
      <p className="mt-1 text-xl font-extrabold text-text-primary dark:text-white">{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}

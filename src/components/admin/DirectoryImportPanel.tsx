import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/useToast";
import { searchPlaces, importPlaces, IMPORT_CAP, isOsmDirectorySource, type PlaceCandidate } from "@/services/places";
import { DIRECTORY_FACILITY_TYPES } from "@/services/placesShared";
import { SENEGAL_REGIONS } from "@/lib/constants";

/** Health-structure types used to scope the directory search. */
const FACILITY_TYPES = DIRECTORY_FACILITY_TYPES.map((t) => t.label);

/**
 * Admin panel: search health structures by ZONE (région) + type via the active
 * directory source (OpenStreetMap/Overpass by default, Google Places as
 * fallback), then import the selection as unclaimed directory pages.
 */
export function DirectoryImportPanel() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [region, setRegion] = useState(SENEGAL_REGIONS[1]);
  const [type, setType] = useState(FACILITY_TYPES[0]);
  const [keyword, setKeyword] = useState("");
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const search = useMutation({
    mutationFn: () => searchPlaces({ region, type, keyword }),
    onSuccess: (res) => {
      setCandidates(res);
      setSelected(new Set(res.filter((c) => !c.alreadyImported).map((c) => c.placeId)));
      if (res.length === 0) notify("Aucun résultat dans cette zone.", "info");
    },
    onError: (e) => notify(e instanceof Error ? `Recherche : ${e.message}` : "Recherche impossible.", "error"),
  });

  const doImport = useMutation({
    mutationFn: () => importPlaces([...selected], region),
    onSuccess: (res) => {
      notify(`${res.imported} importée(s), ${res.skipped} ignorée(s).`, "success");
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "directoryFacilities"] });
      // Refresh "already imported" flags.
      search.mutate();
    },
    onError: (e) => notify(e instanceof Error ? `Import : ${e.message}` : "Import impossible.", "error"),
  });

  function toggle(placeId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(placeId) ? next.delete(placeId) : next.add(placeId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Recherchez des structures de santé <strong>par zone</strong> et créez des fiches d'annuaire.
        Les fiches importées sont « non réclamées » jusqu'à ce qu'un responsable les revendique.
        {isOsmDirectorySource && (
          <>
            {" "}Source : <strong>OpenStreetMap</strong> (données © contributeurs OpenStreetMap,
            sous licence ODbL).
          </>
        )}
      </p>

      <div className="card-surface flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Zone (région)</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-11 rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
          >
            {SENEGAL_REGIONS.slice(1).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Type de structure</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-11 rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
          >
            {FACILITY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Mot-clé <span className="font-normal text-text-secondary">(optionnel)</span>
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !search.isPending && search.mutate()}
              placeholder="Ex. Fann, pédiatrie…"
              className="h-11 w-full rounded-xl border border-border-soft bg-white pl-10 pr-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />
          </div>
        </div>
        <Button onClick={() => search.mutate()} disabled={search.isPending}>
          {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Rechercher
        </Button>
      </div>

      {candidates.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              {selected.size} sélectionnée(s) sur {candidates.length}
              {selected.size > IMPORT_CAP && (
                <span className="ml-1 font-semibold text-amber-700">
                  · max {IMPORT_CAP} par lot
                </span>
              )}
            </p>
            <Button
              onClick={() => doImport.mutate()}
              disabled={doImport.isPending || selected.size === 0 || selected.size > IMPORT_CAP}
            >
              {doImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Importer la sélection
            </Button>
          </div>

          <div className="space-y-2">
            {candidates.map((c) => (
              <label
                key={c.placeId}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 ${
                  c.alreadyImported ? "border-border-soft bg-brand-soft/50" : "border-border-soft bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-brand-green"
                  checked={selected.has(c.placeId)}
                  disabled={c.alreadyImported}
                  onChange={() => toggle(c.placeId)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text-primary">{c.name}</p>
                    {c.alreadyImported && (
                      <Badge tone="green">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Déjà importée
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-text-secondary">
                    <MapPin className="h-3.5 w-3.5" /> {c.address}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </>
      )}

      {!search.isPending && candidates.length === 0 && search.isSuccess && (
        <EmptyState title="Aucun résultat" message="Essayez une autre recherche." />
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Building2, MapPin, Trash2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DirectoryImportPanel } from "@/components/admin/DirectoryImportPanel";
import { AdminSection } from "@/components/admin/AdminSection";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { useDirectoryFacilities, adminKeys } from "@/hooks/useAdminData";
import { setFacilityPublished, deleteFacility } from "@/services/facilities";
import { logAudit } from "@/services/audit";
import type { Facility } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

export default function Directory() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const imported = useDirectoryFacilities();
  const [search, setSearch] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.directoryFacilities });

  const statusMutation = useMutation({
    mutationFn: ({ slug, published }: { slug: string; published: boolean; name: string }) =>
      setFacilityPublished(slug, published),
    onSuccess: (_d, vars) => {
      void logAudit({
        action: vars.published ? "approve" : "reject",
        resourceType: "facility",
        resourceId: vars.slug,
        resourceTitle: vars.name,
        changes: { published: { old: !vars.published, new: vars.published } },
      });
      refresh();
      notify(vars.published ? "Établissement réaffiché ✓" : "Établissement masqué.", "success");
    },
    onError: () => notify("Action impossible.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ slug }: { slug: string; name: string }) => deleteFacility(slug),
    onSuccess: (_d, vars) => {
      void logAudit({
        action: "delete",
        resourceType: "facility",
        resourceId: vars.slug,
        resourceTitle: vars.name,
      });
      refresh();
      notify("Établissement supprimé.", "success");
    },
    onError: () => notify("Suppression impossible.", "error"),
  });

  const filtered = useMemo(() => {
    const list = imported.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.city ?? "").toLowerCase().includes(q) ||
        (f.address ?? "").toLowerCase().includes(q),
    );
  }, [imported.data, search]);

  const busy = statusMutation.isPending || deleteMutation.isPending;

  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Annuaire — import" noIndex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">
          Annuaire (import)
        </h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          Importez des structures de santé depuis Google Places, puis gérez-les ci-dessous.
        </p>
      </header>

      <DirectoryImportPanel />

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-text-primary dark:text-white">
            Établissements importés{" "}
            <span className="text-sm font-normal text-text-secondary">
              ({imported.data?.length ?? 0})
            </span>
          </h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom, ville)…"
            className="w-full max-w-xs rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <AdminSection
          loading={imported.isLoading}
          error={imported.isError}
          refetch={imported.refetch}
          empty={(imported.data?.length ?? 0) === 0}
          emptyTitle="Aucun établissement importé"
          emptyMessage="Utilisez l'outil d'import ci-dessus pour ajouter des structures depuis Google Places."
        >
          {filtered.length === 0 ? (
            <p className="card-surface p-4 text-sm text-text-secondary">
              Aucun résultat pour « {search} ».
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((facility: Facility) => {
                const hidden = facility.published === false;
                return (
                  <div key={facility.slug} className="card-surface flex flex-wrap items-center gap-3 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-text-primary">
                        {facility.name}
                        {hidden && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Masqué
                          </span>
                        )}
                        {facility.claimStatus === "claimed" && (
                          <span className="ml-2 rounded-full bg-brand-mint px-2 py-0.5 text-xs font-semibold text-brand-green">
                            Revendiqué
                          </span>
                        )}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-text-secondary">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {facility.city || facility.address || facility.region || "Localisation non renseignée"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/etablissements/${facility.slug}`} target="_blank">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" /> Voir
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          statusMutation.mutate({
                            slug: facility.slug,
                            published: hidden,
                            name: facility.name,
                          })
                        }
                      >
                        {hidden ? (
                          <>
                            <Eye className="h-4 w-4" /> Réafficher
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" /> Masquer
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Supprimer définitivement « ${facility.name} » ? Cette action est irréversible.`,
                            )
                          ) {
                            deleteMutation.mutate({ slug: facility.slug, name: facility.name });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminSection>
      </section>
    </div>
  );
}

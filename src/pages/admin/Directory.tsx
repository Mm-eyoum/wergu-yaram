import { useMemo, useState } from "react";
import { Building2, MapPin, Trash2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DirectoryImportPanel } from "@/components/admin/DirectoryImportPanel";
import { AdminSection } from "@/components/admin/AdminSection";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { useDirectoryOrganizations, adminKeys } from "@/hooks/useAdminData";
import { setOrganizationStatus, deleteOrganization } from "@/services/organizations";
import { logAudit } from "@/services/audit";
import type { Organization } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

export default function Directory() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const imported = useDirectoryOrganizations();
  const [search, setSearch] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.directoryOrgs });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "suspended"; name: string }) =>
      setOrganizationStatus(id, status),
    onSuccess: (_d, vars) => {
      void logAudit({
        action: vars.status === "active" ? "approve" : "reject",
        resourceType: "organization",
        resourceId: vars.id,
        resourceTitle: vars.name,
        changes: { status: { old: vars.status === "active" ? "suspended" : "active", new: vars.status } },
      });
      refresh();
      notify(vars.status === "active" ? "Établissement réaffiché ✓" : "Établissement masqué.", "success");
    },
    onError: () => notify("Action impossible.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => deleteOrganization(id),
    onSuccess: (_d, vars) => {
      void logAudit({
        action: "delete",
        resourceType: "organization",
        resourceId: vars.id,
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
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.city ?? "").toLowerCase().includes(q) ||
        (o.address ?? "").toLowerCase().includes(q),
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
              {filtered.map((org: Organization) => {
                const suspended = org.status === "suspended";
                return (
                  <div key={org.id} className="card-surface flex flex-wrap items-center gap-3 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-text-primary">
                        {org.name}
                        {suspended && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Masqué
                          </span>
                        )}
                        {org.claimStatus === "claimed" && (
                          <span className="ml-2 rounded-full bg-brand-mint px-2 py-0.5 text-xs font-semibold text-brand-green">
                            Revendiqué
                          </span>
                        )}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-text-secondary">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {org.city || org.address || org.region || "Localisation non renseignée"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/structures/${org.id}`} target="_blank">
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
                            id: org.id,
                            status: suspended ? "active" : "suspended",
                            name: org.name,
                          })
                        }
                      >
                        {suspended ? (
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
                              `Supprimer définitivement « ${org.name} » ? Cette action est irréversible.`,
                            )
                          ) {
                            deleteMutation.mutate({ id: org.id, name: org.name });
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

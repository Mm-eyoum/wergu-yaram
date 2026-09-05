import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonLink } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/useToast";
import { ContentTable } from "@/components/admin/ContentTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { getContentEntry, CONTENT_ENTRIES } from "@/admin/content/entries";
import { SEOHead } from "@/seo/SEOHead";

export const adminContentKey = (type: string) => ["admin", "content", type] as const;

type Row = Record<string, unknown>;

export default function ContentList() {
  const { type } = useParams();
  const entry = getContentEntry(type);
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState(""); // "" all · "__global" · "<slug>"
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const list = useQuery({
    queryKey: adminContentKey(type ?? ""),
    queryFn: () => entry!.admin.listAll(),
    enabled: !!entry,
  });

  const idField = entry?.admin.resource.idField ?? "id";
  const titleField = entry?.admin.resource.titleField ?? "title";
  const getId = (item: Row) => String(item[idField]);
  const getTitle = (item: Row) => String(item[titleField] ?? getId(item));
  const isPublished = (item: Row) => (item as { published?: boolean }).published !== false;

  // Partner spaces present in this content type (moderation a posteriori).
  const tenantSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const r of list.data ?? []) {
      const t = (r as { tenantSlug?: string }).tenantSlug;
      if (t) set.add(t);
    }
    return [...set].sort();
  }, [list.data]);

  const filtered = useMemo(() => {
    let rows = list.data ?? [];
    if (tenantFilter === "__global") rows = rows.filter((r) => !(r as { tenantSlug?: string }).tenantSlug);
    else if (tenantFilter) rows = rows.filter((r) => (r as { tenantSlug?: string }).tenantSlug === tenantFilter);
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => getTitle(r).toLowerCase().includes(q) || getId(r).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data, search, tenantFilter]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminContentKey(type ?? "") });
    queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const togglePublish = useMutation({
    mutationFn: (item: Row) => entry!.admin.setPublished(item, !isPublished(item)),
    onSuccess: () => {
      invalidate();
      notify("Statut mis à jour ✓", "success");
    },
    onError: () => notify("Action impossible.", "error"),
  });

  const remove = useMutation({
    mutationFn: (item: Row) => entry!.admin.remove(item),
    onSuccess: () => {
      invalidate();
      notify("Contenu supprimé.", "success");
      setToDelete(null);
    },
    onError: () => {
      notify("Suppression impossible.", "error");
      setToDelete(null);
    },
  });

  if (!entry) return <Navigate to="/admin/content" replace />;

  // Sous-onglets : types partageant un même `group` (ex. Partenaires).
  const siblings = entry.group ? CONTENT_ENTRIES.filter((e) => e.group === entry.group) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <SEOHead title={entry.label} noIndex />
      <Link to="/admin/content" className="mb-2 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand-green">
        <ChevronLeft className="h-4 w-4" /> Contenus
      </Link>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">{entry.label}</h1>
          {entry.description && (
            <p className="mt-0.5 max-w-2xl text-sm text-text-secondary dark:text-white/60">{entry.description}</p>
          )}
          <p className="text-xs text-text-secondary/80 dark:text-white/50">{filtered.length} élément(s)</p>
        </div>
        <ButtonLink to={`/admin/content/${entry.key}/new`} size="sm">
          <Plus className="h-4 w-4" /> Nouveau {entry.singular.toLowerCase()}
        </ButtonLink>
      </header>

      {siblings.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {siblings.map((s) => {
            const active = s.key === type;
            return (
              <Link
                key={s.key}
                to={`/admin/content/${s.key}`}
                title={s.description}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-green text-white"
                    : "border border-border-soft bg-white text-text-secondary hover:border-brand-teal hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-xl border border-black/10 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        {tenantSlugs.length > 0 && (
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            title="Filtrer par espace partenaire"
            className="rounded-xl border border-black/10 py-2 px-3 text-sm outline-none focus:border-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="">Tous les espaces</option>
            <option value="__global">Contenu global (éditorial)</option>
            {tenantSlugs.map((s) => (
              <option key={s} value={s}>Espace : {s}</option>
            ))}
          </select>
        )}
      </div>

      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState onRetry={list.refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun contenu"
          message={search ? "Aucun résultat pour cette recherche." : `Créez votre premier ${entry.singular.toLowerCase()}.`}
        />
      ) : (
        <ContentTable
          items={filtered}
          columns={entry.columns}
          getId={getId}
          getTitle={getTitle}
          isPublished={isPublished}
          editHref={(item) => `/admin/content/${entry.key}/${getId(item)}/edit`}
          onTogglePublish={(item) => togglePublish.mutate(item)}
          onDelete={(item) => setToDelete(item)}
          busyId={togglePublish.isPending || remove.isPending ? getId((togglePublish.variables ?? remove.variables) as Row) : null}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Supprimer « ${getTitle(toDelete)} » ?`}
          message="Cette action est irréversible et retire le contenu de la plateforme."
          confirmLabel="Supprimer"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(toDelete)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

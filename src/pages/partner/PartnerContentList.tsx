import { useMemo, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { ContentTable } from "@/components/admin/ContentTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { getPartnerEntry } from "@/admin/content/partnerEntries";
import { makeContentAdmin } from "@/services/admin/contentAdmin";
import { SEOHead } from "@/seo/SEOHead";

type Row = Record<string, unknown>;

/** Tenant-scoped content list — only this space's docs (tenantSlug == slug). */
export default function PartnerContentList() {
  const { slug, type } = useParams();
  const { user } = useAuth();
  const entry = getPartnerEntry(type);
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const base = `/espace/${slug}/gestion/contenus`;

  const admin = useMemo(
    () =>
      entry && slug
        ? makeContentAdmin(entry.admin.resource, { field: "tenantSlug", value: slug, ownerUid: user?.uid })
        : null,
    [entry, slug, user?.uid],
  );

  const queryKey = ["partner", "content", slug, type] as const;
  const list = useQuery({ queryKey, queryFn: () => admin!.listAll(), enabled: !!admin });

  const idField = entry?.admin.resource.idField ?? "id";
  const titleField = entry?.admin.resource.titleField ?? "title";
  const getId = (item: Row) => String(item[idField]);
  const getTitle = (item: Row) => String(item[titleField] ?? getId(item));
  const isPublished = (item: Row) => (item as { published?: boolean }).published !== false;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const togglePublish = useMutation({
    mutationFn: (item: Row) => admin!.setPublished(item, !isPublished(item)),
    onSuccess: () => { invalidate(); notify("Statut mis à jour ✓", "success"); },
    onError: () => notify("Action impossible.", "error"),
  });
  const remove = useMutation({
    mutationFn: (item: Row) => admin!.remove(item),
    onSuccess: () => { invalidate(); notify("Contenu supprimé.", "success"); setToDelete(null); },
    onError: () => { notify("Suppression impossible.", "error"); setToDelete(null); },
  });

  if (!entry) return <Navigate to={`/espace/${slug}/gestion/contenus`} replace />;

  return (
    <div className="mx-auto max-w-6xl">
      <SEOHead title={entry.label} noIndex />
      <Link to={base} className="mb-2 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand-green">
        <ChevronLeft className="h-4 w-4" /> Contenus
      </Link>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">{entry.label}</h1>
          <p className="text-sm text-text-secondary dark:text-white/60">{list.data?.length ?? 0} élément(s)</p>
        </div>
        <ButtonLink to={`${base}/${entry.key}/new`} size="sm">
          <Plus className="h-4 w-4" /> Nouveau {entry.singular.toLowerCase()}
        </ButtonLink>
      </header>

      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState onRetry={list.refetch} />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState title="Aucun contenu" message={`Créez votre premier ${entry.singular.toLowerCase()}.`} />
      ) : (
        <ContentTable
          items={(list.data ?? []) as Row[]}
          columns={entry.columns}
          getId={getId}
          getTitle={getTitle}
          isPublished={isPublished}
          editHref={(item) => `${base}/${entry.key}/${getId(item)}/edit`}
          onTogglePublish={(item) => togglePublish.mutate(item)}
          onDelete={(item) => setToDelete(item)}
          busyId={togglePublish.isPending || remove.isPending ? getId((togglePublish.variables ?? remove.variables) as Row) : null}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Supprimer « ${getTitle(toDelete)} » ?`}
          message="Cette action est irréversible et retire le contenu de votre espace."
          confirmLabel="Supprimer"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(toDelete)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

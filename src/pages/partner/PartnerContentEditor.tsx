import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { SchemaForm } from "@/components/admin/fields/SchemaForm";
import { getPartnerEntry } from "@/admin/content/partnerEntries";
import { makeContentAdmin } from "@/services/admin/contentAdmin";
import { slugify } from "@/lib/slug";
import { SEOHead } from "@/seo/SEOHead";

type Row = Record<string, unknown>;

/** Tenant-namespaced id for partner-created content (collision-safe across spaces). */
function makePartnerId(base: string, titleField: string, value: Row): string {
  const title = slugify(String(value[titleField] ?? "")) || "contenu";
  const suffix = Date.now().toString(36).slice(-4);
  return `${base}-${title}-${suffix}`;
}

/** Tenant-scoped content editor (create/edit). Publication is immediate. */
export default function PartnerContentEditor() {
  const { slug, type, id } = useParams();
  const { user } = useAuth();
  const entry = getPartnerEntry(type);
  const isNew = !id;
  const { notify } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listPath = `/espace/${slug}/gestion/contenus/${type}`;

  const admin = useMemo(
    () =>
      entry && slug
        ? makeContentAdmin(entry.admin.resource, { field: "tenantSlug", value: slug, ownerUid: user?.uid })
        : null,
    [entry, slug, user?.uid],
  );

  const [value, setValue] = useState<Row | null>(isNew && entry ? (entry.empty() as Row) : null);

  const detail = useQuery({
    queryKey: ["partner", "content", slug, type, "one", id ?? ""],
    queryFn: () => admin!.getOne(id!),
    enabled: !!admin && !isNew,
  });

  useEffect(() => {
    if (!isNew && detail.data && value === null) setValue(detail.data as Row);
  }, [detail.data, isNew, value]);

  const save = useMutation({
    mutationFn: (row: Row) => admin!.save(row, { isNew }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner", "content", slug, type] });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      notify(isNew ? "Contenu créé et publié ✓" : "Contenu enregistré ✓", "success");
      navigate(listPath);
    },
    onError: () => notify("Enregistrement impossible.", "error"),
  });

  if (!entry) return <Navigate to={`/espace/${slug}/gestion/contenus`} replace />;

  function handleSave() {
    if (!value || !entry) return;
    const idField = entry.admin.resource.idField;
    const row = { ...value };
    if (isNew) {
      // Auto-assign a tenant-namespaced id so partners never collide with global
      // content or each other (they don't manage the raw slug).
      row[idField] = makePartnerId(slug!, entry.admin.resource.titleField, value);
    }
    save.mutate(row);
  }

  if (!isNew && detail.isLoading) return <LoadingState />;
  if (!isNew && detail.isError) return <ErrorState onRetry={detail.refetch} />;
  if (!value) return <LoadingState />;

  const published = (value as { published?: boolean }).published !== false;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <SEOHead title={isNew ? `Nouveau ${entry.singular.toLowerCase()}` : `Modifier — ${entry.label}`} noIndex />
      <Link to={listPath} className="mb-2 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand-green">
        <ChevronLeft className="h-4 w-4" /> {entry.label}
      </Link>
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white">
          {isNew ? `Nouveau ${entry.singular.toLowerCase()}` : String(value[entry.admin.resource.titleField] || entry.singular)}
        </h1>
        {!isNew && <Badge tone={published ? "green" : "warning"}>{published ? "Publié" : "Brouillon"}</Badge>}
      </header>

      <SchemaForm schema={entry.schema} value={value} onChange={setValue} />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-brand-navy/90">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-2 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(listPath)}>Annuler</Button>
          <Button size="sm" onClick={handleSave} disabled={save.isPending}>
            {isNew ? "Créer & publier" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

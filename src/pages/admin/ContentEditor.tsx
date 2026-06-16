import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/hooks/useToast";
import { SchemaForm } from "@/components/admin/fields/SchemaForm";
import { getContentEntry } from "@/admin/content/entries";
import { adminContentKey } from "./ContentList";
import { SEOHead } from "@/seo/SEOHead";

type Row = Record<string, unknown>;

export default function ContentEditor() {
  const { type, id } = useParams();
  const entry = getContentEntry(type);
  const isNew = !id;
  const { notify } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [value, setValue] = useState<Row | null>(isNew && entry ? entry.empty() : null);

  const detail = useQuery({
    queryKey: ["admin", "content", type ?? "", "one", id ?? ""],
    queryFn: () => entry!.admin.getOne(id!),
    enabled: !!entry && !isNew,
  });

  useEffect(() => {
    if (!isNew && detail.data && value === null) setValue(detail.data as Row);
  }, [detail.data, isNew, value]);

  const save = useMutation({
    mutationFn: () => entry!.admin.save(value as Row, { isNew }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminContentKey(type ?? "") });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      notify(isNew ? "Contenu créé ✓" : "Contenu enregistré ✓", "success");
      navigate(`/admin/content/${type}`);
    },
    onError: () => notify("Enregistrement impossible.", "error"),
  });

  if (!entry) return <Navigate to="/admin/content" replace />;

  function handleSave() {
    if (!value) return;
    const idField = entry!.admin.resource.idField;
    const idVal = String(value[idField] ?? "").trim();
    if (!idVal) {
      notify("Le slug / identifiant est requis.", "error");
      return;
    }
    save.mutate();
  }

  if (!isNew && detail.isLoading) return <LoadingState />;
  if (!isNew && detail.isError) return <ErrorState onRetry={detail.refetch} />;
  if (!value) return <LoadingState />;

  const published = (value as { published?: boolean }).published !== false;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <SEOHead title={isNew ? `Nouveau ${entry.singular.toLowerCase()}` : `Modifier — ${entry.label}`} noIndex />

      <Link to={`/admin/content/${entry.key}`} className="mb-2 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand-green">
        <ChevronLeft className="h-4 w-4" /> {entry.label}
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white">
            {isNew ? `Nouveau ${entry.singular.toLowerCase()}` : String(value[entry.admin.resource.titleField] || entry.singular)}
          </h1>
          {!isNew && <Badge tone={published ? "green" : "warning"}>{published ? "Publié" : "Brouillon"}</Badge>}
        </div>
        {!isNew && entry.publicHref && published && (
          <a
            href={entry.publicHref(value)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> Voir sur le site
          </a>
        )}
      </header>

      <SchemaForm schema={entry.schema} value={value} onChange={setValue} />

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-brand-navy/90">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-2 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/content/${entry.key}`)}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleSave} disabled={save.isPending}>
            {isNew ? "Créer" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

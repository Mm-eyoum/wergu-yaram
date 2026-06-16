import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormInput";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/useToast";
import { useMediaList, mediaKeys } from "@/hooks/useMedia";
import { deleteMedia, updateMediaMeta, type MediaCategory, type MediaItem } from "@/services/media";
import { logAudit } from "@/services/audit";
import { MediaGrid } from "@/components/admin/MediaGrid";
import { MediaUploadZone } from "@/components/admin/MediaUploadZone";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SEOHead } from "@/seo/SEOHead";

const CATEGORIES: { key: MediaCategory | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "image", label: "Images" },
  { key: "video", label: "Vidéos" },
  { key: "audio", label: "Audio" },
  { key: "document", label: "Documents" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function Media() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<MediaCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const list = useMediaList(category === "all" ? undefined : category);
  const items = useMemo(() => {
    const all = list.data?.pages.flatMap((p) => p.items) ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (i) =>
        i.filenameOriginal.toLowerCase().includes(q) ||
        (i.altText ?? "").toLowerCase().includes(q) ||
        (i.title ?? "").toLowerCase().includes(q),
    );
  }, [list.data, search]);

  const saveMeta = useMutation({
    mutationFn: (item: MediaItem) =>
      updateMediaMeta(item.id, { altText: item.altText, title: item.title, caption: item.caption }),
    onSuccess: (_d, item) => {
      void logAudit({ action: "update", resourceType: "media", resourceId: item.id, resourceTitle: item.filenameOriginal });
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      notify("Métadonnées enregistrées ✓", "success");
    },
    onError: () => notify("Enregistrement impossible.", "error"),
  });

  const remove = useMutation({
    mutationFn: (item: MediaItem) => deleteMedia(item),
    onSuccess: (_d, item) => {
      void logAudit({ action: "delete", resourceType: "media", resourceId: item.id, resourceTitle: item.filenameOriginal });
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      notify("Fichier supprimé.", "success");
      setSelected(null);
      setConfirmDelete(false);
    },
    onError: () => {
      notify("Suppression impossible.", "error");
      setConfirmDelete(false);
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <SEOHead title="Médiathèque" noIndex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Médiathèque</h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          Téléversez et gérez les images, vidéos et documents de la plateforme.
        </p>
      </header>

      <MediaUploadZone className="mb-6" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition",
                category === c.key
                  ? "bg-brand-green text-white"
                  : "bg-brand-soft text-text-secondary hover:bg-brand-mint dark:bg-white/5 dark:text-white/70",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-xl border border-black/10 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          {list.isLoading ? (
            <LoadingState />
          ) : list.isError ? (
            <ErrorState onRetry={list.refetch} />
          ) : items.length === 0 ? (
            <EmptyState title="Aucun média" message="Téléversez un premier fichier ci-dessus." />
          ) : (
            <>
              <MediaGrid items={items} selectedId={selected?.id} onSelect={setSelected} />
              {list.hasNextPage && !search && (
                <div className="mt-5 text-center">
                  <Button variant="outline" size="sm" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                    Charger plus
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {selected && (
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-20 rounded-2xl border border-black/5 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-white/5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <Badge tone="mint">{selected.category}</Badge>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Fermer le panneau"
                  className="grid h-7 w-7 place-items-center rounded-lg text-text-secondary hover:bg-brand-soft dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selected.category === "image" ? (
                <img src={selected.url} alt={selected.altText || selected.filenameOriginal} className="mb-3 w-full rounded-xl object-cover" />
              ) : (
                <a href={selected.url} target="_blank" rel="noreferrer" className="mb-3 block truncate text-sm text-brand-green underline">
                  Ouvrir le fichier
                </a>
              )}

              <p className="truncate text-xs text-text-secondary dark:text-white/50">
                {selected.filenameOriginal} · {formatBytes(selected.size)}
                {selected.width ? ` · ${selected.width}×${selected.height}` : ""}
              </p>

              <div className="mt-3 space-y-3">
                <FormInput
                  label="Texte alternatif"
                  value={selected.altText ?? ""}
                  onChange={(e) => setSelected({ ...selected, altText: e.target.value })}
                />
                <FormInput
                  label="Titre"
                  value={selected.title ?? ""}
                  onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                />
                <FormInput
                  label="Légende"
                  value={selected.caption ?? ""}
                  onChange={(e) => setSelected({ ...selected, caption: e.target.value })}
                />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" onClick={() => saveMeta.mutate(selected)} disabled={saveMeta.isPending}>
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {confirmDelete && selected && (
        <ConfirmDialog
          title="Supprimer ce fichier ?"
          message="Cette action est irréversible. Le fichier sera retiré de la médiathèque et du stockage."
          confirmLabel="Supprimer"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(selected)}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

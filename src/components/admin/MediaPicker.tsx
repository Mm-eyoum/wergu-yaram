import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMediaList } from "@/hooks/useMedia";
import { MediaGrid } from "./MediaGrid";
import { MediaUploadZone } from "./MediaUploadZone";
import type { MediaItem } from "@/services/media";

/**
 * Modal media selector reused by every content editor's image/file fields.
 * Restricts to images by default; pass `category` to widen/narrow.
 */
export function MediaPicker({
  category = "image",
  onPick,
  onClose,
}: {
  category?: MediaItem["category"];
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const list = useMediaList(category);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-card dark:bg-brand-navy"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-black/5 px-5 py-3 dark:border-white/10">
          <h2 className="font-bold text-text-primary dark:text-white">Médiathèque</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-lg text-text-secondary hover:bg-brand-soft dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <MediaUploadZone className="mb-5" onUploaded={(items) => items[0] && setSelected(items[0])} />

          {list.isLoading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState title="Médiathèque vide" message="Téléversez un premier fichier ci-dessus." />
          ) : (
            <>
              <MediaGrid items={items} selectedId={selected?.id} onSelect={setSelected} />
              {list.hasNextPage && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => list.fetchNextPage()}
                    disabled={list.isFetchingNextPage}
                  >
                    Charger plus
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-black/5 px-5 py-3 dark:border-white/10">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={!selected}
            onClick={() => selected && onPick(selected)}
          >
            Choisir
          </Button>
        </footer>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/hooks/useToast";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { uploadMedia, type MediaItem } from "@/services/media";
import { mediaKeys } from "@/hooks/useMedia";

const ACCEPT = "image/*,video/*,audio/*,application/pdf";

/** Drag-and-drop multi-file uploader feeding the media library. */
export function MediaUploadZone({
  folder,
  onUploaded,
  className,
}: {
  folder?: string;
  onUploaded?: (items: MediaItem[]) => void;
  className?: string;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    const uploaded: MediaItem[] = [];
    for (const file of list) {
      try {
        const item = await uploadMedia(file, folder);
        uploaded.push(item);
      } catch (err) {
        notify(err instanceof Error ? err.message : "Échec du téléversement.", "error");
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setProgress(null);
    if (uploaded.length) {
      await queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      notify(`${uploaded.length} fichier(s) téléversé(s) ✓`, "success");
      onUploaded?.(uploaded);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        disabled={!!progress}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
          dragging
            ? "border-brand-green bg-brand-mint/60"
            : "border-black/10 hover:border-brand-green/60 hover:bg-brand-soft dark:border-white/15 dark:hover:bg-white/5",
        )}
      >
        <UploadCloud className="h-8 w-8 text-brand-green" />
        <span className="text-sm font-semibold text-text-primary dark:text-white">
          Glissez-déposez des fichiers ou cliquez pour parcourir
        </span>
        <span className="text-xs text-text-secondary dark:text-white/50">
          Images, vidéos, audio, PDF — 25 Mo max
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {progress && (
        <div className="mt-3">
          <ProgressBar value={(progress.done / progress.total) * 100} />
          <p className="mt-1 text-xs text-text-secondary dark:text-white/50">
            Téléversement {progress.done}/{progress.total}…
          </p>
        </div>
      )}
    </div>
  );
}

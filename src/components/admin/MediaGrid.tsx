import { FileText, Film, Music } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MediaItem } from "@/services/media";

/** Thumbnail tile for a non-image media item. */
function FileThumb({ category }: { category: MediaItem["category"] }) {
  const Icon = category === "video" ? Film : category === "audio" ? Music : FileText;
  return (
    <span className="grid h-full w-full place-items-center bg-brand-soft text-text-secondary dark:bg-white/5">
      <Icon className="h-8 w-8" />
    </span>
  );
}

/** Responsive grid of media tiles; clicking a tile fires `onSelect`. */
export function MediaGrid({
  items,
  selectedId,
  onSelect,
}: {
  items: MediaItem[];
  selectedId?: string | null;
  onSelect: (item: MediaItem) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              "group block aspect-square w-full overflow-hidden rounded-xl border bg-white transition dark:bg-white/5",
              selectedId === item.id
                ? "border-brand-green ring-2 ring-brand-green/40"
                : "border-black/10 hover:border-brand-green/50 dark:border-white/10",
            )}
            title={item.filenameOriginal}
          >
            {item.category === "image" ? (
              <img
                src={item.url}
                alt={item.altText || item.filenameOriginal}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <FileThumb category={item.category} />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

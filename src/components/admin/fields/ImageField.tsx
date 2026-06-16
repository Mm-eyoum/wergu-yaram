import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { MediaPicker } from "@/components/admin/MediaPicker";

/**
 * Image URL field backed by the media library. Stores the public URL string;
 * opens the MediaPicker to choose/upload, or accepts a pasted URL.
 */
export function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-border-soft bg-brand-soft dark:border-white/10 dark:bg-white/5">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-text-secondary" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="rounded-xl bg-brand-mint px-3 py-1.5 text-sm font-medium text-brand-green hover:bg-brand-mint/70"
            >
              Choisir dans la médiathèque
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                aria-label="Retirer l'image"
                className="grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-brand-soft dark:hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <input
            className="h-9 w-full rounded-xl border border-border-soft bg-white px-3 text-xs text-text-secondary focus:border-brand-teal focus:outline-none dark:border-white/15 dark:bg-white/5"
            value={value}
            placeholder="ou collez une URL d'image"
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>

      {picking && (
        <MediaPicker
          category="image"
          onPick={(item) => {
            onChange(item.url);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

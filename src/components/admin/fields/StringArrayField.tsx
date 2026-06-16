import { Plus, X } from "lucide-react";

const INPUT =
  "h-10 w-full rounded-xl border border-border-soft bg-white px-3 text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30 dark:border-white/15 dark:bg-white/5 dark:text-white";

/** Editable list of free-text strings (symptoms, services, bullets, …). */
export function StringArrayField({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {value.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={INPUT}
            value={entry}
            placeholder={placeholder}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
          />
          <button
            type="button"
            aria-label="Retirer"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-text-secondary hover:bg-brand-soft dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:underline"
      >
        <Plus className="h-4 w-4" /> Ajouter
      </button>
    </div>
  );
}

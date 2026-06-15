import { SlidersHorizontal } from "lucide-react";

export interface FilterGroup {
  title: string;
  options: { value: string; label: string; count?: number }[];
}

interface FilterSidebarProps {
  groups: FilterGroup[];
  selected: Record<string, string>;
  onChange: (groupTitle: string, value: string) => void;
  onReset?: () => void;
}

/** Left filter column (radio-style single select per group). */
export function FilterSidebar({ groups, selected, onChange, onReset }: FilterSidebarProps) {
  return (
    <aside className="card-surface h-fit p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <SlidersHorizontal className="h-4 w-4 text-brand-green" />
          Filtres
        </h2>
        {onReset && (
          <button onClick={onReset} className="text-xs font-semibold text-brand-green hover:underline">
            Réinitialiser
          </button>
        )}
      </header>

      <div className="space-y-5">
        {groups.map((group) => (
          <fieldset key={group.title}>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {group.title}
            </legend>
            <div className="space-y-1">
              {group.options.map((opt) => {
                const checked = selected[group.title] === opt.value;
                return (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-brand-soft"
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name={group.title}
                        checked={checked}
                        onChange={() => onChange(group.title, opt.value)}
                        className="h-4 w-4 accent-brand-green"
                      />
                      <span className={checked ? "font-medium text-text-primary" : "text-text-secondary"}>
                        {opt.label}
                      </span>
                    </span>
                    {typeof opt.count === "number" && (
                      <span className="text-xs text-text-secondary">{opt.count}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </aside>
  );
}

import { useState } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import type { FilterGroup } from "@/lib/searchFilters";

export type { FilterGroup } from "@/lib/searchFilters";

interface FilterSidebarProps {
  groups: FilterGroup[];
  selected: Record<string, string | string[]>;
  onChange: (groupKey: string, value: string | string[]) => void;
  onReset?: () => void;
}

/** Number of active (non-empty) selections across the rendered groups. */
function countActive(groups: FilterGroup[], selected: Record<string, string | string[]>): number {
  let n = 0;
  for (const g of groups) {
    const v = selected[g.key];
    if (Array.isArray(v)) n += v.length;
    else if (v) n += 1;
  }
  return n;
}

/**
 * Left filter column. Each group renders according to its `kind`:
 * radio (single), checkbox (multi), toggle (boolean) or select (dropdown).
 * On mobile the whole panel collapses behind a "Filtres" button.
 */
export function FilterSidebar({ groups, selected, onChange, onReset }: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  const activeCount = countActive(groups, selected);

  function toggleMulti(key: string, optValue: string) {
    const current = selected[key];
    const arr = Array.isArray(current) ? current : current ? [current] : [];
    const next = arr.includes(optValue) ? arr.filter((v) => v !== optValue) : [...arr, optValue];
    onChange(key, next);
  }

  return (
    <aside className="h-fit lg:sticky lg:top-24">
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-border-soft bg-white px-4 py-3 text-sm font-bold text-text-primary lg:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-brand-green" />
          Filtres
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-green px-2 py-0.5 text-xs font-semibold text-white">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div className={`card-surface p-5 ${open ? "block" : "hidden"} lg:block`}>
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <SlidersHorizontal className="h-4 w-4 text-brand-green" />
            Filtres
            {activeCount > 0 && (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-green">
                {activeCount}
              </span>
            )}
          </h2>
          {onReset && activeCount > 0 && (
            <button onClick={onReset} className="text-xs font-semibold text-brand-green hover:underline">
              Réinitialiser
            </button>
          )}
        </header>

        <div className="space-y-5">
          {groups.map((group) => (
            <fieldset key={group.key}>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {group.title}
              </legend>

              {group.kind === "select" ? (
                <select
                  value={(Array.isArray(selected[group.key]) ? selected[group.key][0] : selected[group.key]) ?? ""}
                  onChange={(e) => onChange(group.key, e.target.value)}
                  className="w-full rounded-lg border border-border-soft bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-green focus:outline-none"
                >
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                      {typeof opt.count === "number" && opt.value ? ` (${opt.count})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-1">
                  {group.options.map((opt) => {
                    const sel = selected[group.key];
                    const checked =
                      group.kind === "toggle"
                        ? sel === "1"
                        : group.kind === "checkbox"
                          ? Array.isArray(sel)
                            ? sel.includes(opt.value)
                            : sel === opt.value
                          : sel === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-brand-soft"
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type={group.kind === "radio" ? "radio" : "checkbox"}
                            name={group.key}
                            checked={checked}
                            onChange={() => {
                              if (group.kind === "toggle") onChange(group.key, checked ? "" : "1");
                              else if (group.kind === "checkbox") toggleMulti(group.key, opt.value);
                              else onChange(group.key, opt.value);
                            }}
                            className="h-4 w-4 accent-brand-green"
                          />
                          <span className={checked ? "font-medium text-text-primary" : "text-text-secondary"}>
                            {opt.label}
                          </span>
                        </span>
                        {typeof opt.count === "number" && group.kind !== "toggle" && (
                          <span className="text-xs text-text-secondary">{opt.count}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          ))}
        </div>
      </div>
    </aside>
  );
}

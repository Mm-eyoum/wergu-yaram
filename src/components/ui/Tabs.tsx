import { cn } from "@/lib/cn";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/** Horizontal underline tabs — used for search results and filter rows. */
export function Tabs({ items, active, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn("flex gap-1 overflow-x-auto border-b border-border-soft scroll-thin", className)}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative whitespace-nowrap px-3.5 py-3 text-sm font-medium transition-colors",
              isActive ? "text-brand-green" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                  isActive ? "bg-brand-green/10 text-brand-green" : "bg-slate-100 text-text-secondary",
                )}
              >
                {item.count}
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-green" />
            )}
          </button>
        );
      })}
    </div>
  );
}

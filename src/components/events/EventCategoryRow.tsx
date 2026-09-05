import {
  ShieldCheck,
  Baby,
  Salad,
  Brain,
  Video,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

/** Thèmes d'événements santé (façon « Browse by category » d'Eventbrite). */
export const EVENT_CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "prevention", label: "Prévention & dépistage", icon: ShieldCheck },
  { value: "maternelle", label: "Santé maternelle", icon: Baby },
  { value: "nutrition", label: "Nutrition", icon: Salad },
  { value: "mentale", label: "Santé mentale", icon: Brain },
  { value: "webinaire", label: "Webinaires", icon: Video },
  { value: "atelier", label: "Ateliers", icon: GraduationCap },
];

/** Horizontal, scroll-snap row of category chips. `active` toggles selection. */
export function EventCategoryRow({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {EVENT_CATEGORIES.map(({ value, label, icon: Icon }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(isActive ? "" : value)}
            className={cn(
              "flex min-h-[44px] shrink-0 snap-start items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              isActive
                ? "border-brand-green bg-brand-green/10 text-brand-green"
                : "border-border-soft bg-white text-text-secondary hover:border-brand-teal hover:text-brand-green",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

import { PIN_COLORS, type PinColor } from "./leafletSetup";

const ITEMS: { color: PinColor; label: string }[] = [
  { color: "green", label: "Établissement vérifié" },
  { color: "amber", label: "Annuaire (non réclamé)" },
  { color: "navy", label: "Sélection" },
];

/** Small legend overlay explaining the pin colors. */
export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-2xl border border-border-soft bg-white/90 px-3 py-2 shadow-soft backdrop-blur">
      <ul className="space-y-1">
        {ITEMS.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-[11px] font-medium text-text-secondary">
            <span
              className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
              style={{ backgroundColor: PIN_COLORS[it.color] }}
            />
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

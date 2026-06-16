const INPUT =
  "h-11 w-full rounded-xl border border-border-soft bg-white px-3.5 text-sm text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30 dark:border-white/15 dark:bg-white/5 dark:text-white";

interface Coords {
  lat: number;
  lng: number;
}

/** Latitude / longitude pair editor. */
export function CoordsField({
  value,
  onChange,
}: {
  value?: Coords;
  onChange: (next: Coords) => void;
}) {
  const lat = value?.lat ?? 0;
  const lng = value?.lng ?? 0;
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-1 block text-xs text-text-secondary">Latitude</span>
        <input
          type="number"
          step="any"
          className={INPUT}
          value={Number.isFinite(lat) ? lat : ""}
          onChange={(e) => onChange({ lat: Number(e.target.value), lng })}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-text-secondary">Longitude</span>
        <input
          type="number"
          step="any"
          className={INPUT}
          value={Number.isFinite(lng) ? lng : ""}
          onChange={(e) => onChange({ lat, lng: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}

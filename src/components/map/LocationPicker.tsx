import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Loader2 } from "lucide-react";
import type { Coords } from "@/types/domain";
import { useGeolocation } from "@/hooks/useGeolocation";
import { searchAddress, reverseGeocode, type GeoSuggestion } from "@/services/geocoding";

const LocationPickerMap = lazy(() => import("./LocationPickerMap"));

export interface LocationValue {
  address: string;
  city: string;
  coords: Coords | null;
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  label?: string;
}

/**
 * Combined location input for forms: address autocomplete (Photon) OR a
 * "use my position" GPS button OR dragging the pin on the map. All three keep
 * `address`, `city` and `coords` in sync (reverse-geocoding when the pin moves).
 */
export function LocationPicker({ value, onChange, label = "Localisation" }: LocationPickerProps) {
  const geo = useGeolocation();
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Forward search (debounced) as the user types the address.
  function handleAddressInput(text: string) {
    onChange({ ...value, address: text });
    clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchAddress(text);
      setSuggestions(res);
      setOpen(res.length > 0);
      setSearching(false);
    }, 400);
  }

  function selectSuggestion(s: GeoSuggestion) {
    onChange({ address: s.address, city: s.city || value.city, coords: s.coords });
    setOpen(false);
    setSuggestions([]);
  }

  // When the pin is dropped / GPS used, reverse-geocode to fill the address.
  async function setCoords(coords: Coords) {
    onChange({ ...value, coords });
    const { address, city } = await reverseGeocode(coords);
    onChange({ address: address || value.address, city: city || value.city, coords });
  }

  // Apply the GPS position when the user grants it.
  useEffect(() => {
    if (geo.status === "granted" && geo.position) {
      void setCoords(geo.position);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.position]);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-primary">{label}</label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            value={value.address}
            onChange={(e) => handleAddressInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Rechercher une adresse…"
            className="h-11 w-full rounded-xl border border-border-soft bg-white pl-10 pr-9 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-secondary" />
          )}
          {open && (
            <ul className="absolute z-[1000] mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border-soft bg-white py-1 shadow-soft">
              {suggestions.map((s, i) => (
                <li key={`${s.label}-${i}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(s)}
                    className="block w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-brand-mint"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={geo.request}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border-soft bg-white px-3 text-sm font-semibold text-text-primary hover:border-brand-teal hover:text-brand-green"
          title="Utiliser ma position actuelle"
        >
          {geo.status === "prompt" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          Ma position
        </button>
      </div>

      {geo.error && <p className="mt-1.5 text-xs text-danger">{geo.error}</p>}
      <p className="mt-1.5 text-xs text-text-secondary">
        Recherchez une adresse, utilisez votre position, ou déplacez l'épingle pour ajuster.
      </p>

      <div className="mt-2 overflow-hidden rounded-2xl border border-border-soft">
        <Suspense fallback={<div className="h-56 w-full animate-pulse bg-brand-mint/40" />}>
          <LocationPickerMap value={value.coords} onPick={setCoords} />
        </Suspense>
      </div>
    </div>
  );
}

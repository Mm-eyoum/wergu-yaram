import { useState, useRef, useEffect } from "react";
import { Navigation, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Coords } from "@/types/domain";
import { directionsUrl, type DirectionsProvider } from "@/lib/geo";

const PROVIDERS: { id: DirectionsProvider; label: string }[] = [
  { id: "google", label: "Google Maps" },
  { id: "waze", label: "Waze" },
  { id: "apple", label: "Plans (Apple)" },
];

interface Props {
  to: Coords;
  className?: string;
}

/** "Itinéraire" CTA with a provider menu (Google Maps / Waze / Apple Plans). */
export function DirectionsButton({ to, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-soft bg-white px-5 text-sm font-semibold text-text-primary transition-all hover:border-brand-teal hover:text-brand-green"
      >
        <Navigation className="h-4 w-4" /> Itinéraire
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[1000] mt-1 w-44 overflow-hidden rounded-xl border border-border-soft bg-white py-1 shadow-soft"
        >
          {PROVIDERS.map((p) => (
            <a
              key={p.id}
              role="menuitem"
              href={directionsUrl(to, p.id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-text-primary hover:bg-brand-mint hover:text-brand-green"
            >
              {p.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

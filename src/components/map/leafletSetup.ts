/**
 * Shared Leaflet configuration. Imported by every map component so the CSS and
 * marker icons are set up exactly once. Uses inline SVG `divIcon`s (colored pins)
 * to avoid the classic bundler issue with Leaflet's default marker image paths.
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Brand-aligned pin colors. */
export const PIN_COLORS = {
  green: "#1f9d63", // brand-green — facilities / default
  teal: "#0ea5a5", // events
  amber: "#f59e0b", // urgent equipment needs
  navy: "#1e3a5f", // selected / user picker
  red: "#ef4444",
} as const;

export type PinColor = keyof typeof PIN_COLORS;

function pinSvg(hex: string): string {
  return `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13.4 25.2 14 25.8a1.4 1.4 0 0 0 2 0C16.6 40.2 30 25.5 30 15 30 6.7 23.3 0 15 0z" fill="${hex}"/>
    <circle cx="15" cy="15" r="6" fill="#fff"/>
  </svg>`;
}

const iconCache = new Map<string, L.DivIcon>();

/** A colored teardrop pin icon, cached per color. */
export function pinIcon(color: PinColor = "green"): L.DivIcon {
  const cached = iconCache.get(color);
  if (cached) return cached;
  const icon = L.divIcon({
    html: pinSvg(PIN_COLORS[color]),
    className: "wy-pin",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });
  iconCache.set(color, icon);
  return icon;
}

export { L };

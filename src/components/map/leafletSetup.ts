/**
 * Shared Leaflet configuration. Imported by every map component so the CSS and
 * marker icons are set up exactly once. Uses inline SVG `divIcon`s so the markers,
 * clusters and the user-location dot stay on-brand and avoid the classic bundler
 * issue with Leaflet's default marker image paths.
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Brand-aligned pin colors (charte). */
export const PIN_COLORS = {
  green: "#007A5E", // brand-green — verified facilities / default
  teal: "#00B894", // brand-teal — events
  amber: "#F6B44B", // warning — directory (unclaimed) / urgent needs
  navy: "#0B1F49", // brand-navy — selected / picker
  red: "#C81E1E", // danger
} as const;

export type PinColor = keyof typeof PIN_COLORS;

/** Optional glyph drawn inside the pin head (16x16 viewBox paths, lucide-like). */
export type PinGlyph = "hospital" | "event" | "need" | "partner";

const GLYPHS: Record<PinGlyph, string> = {
  // simplified, centered ~10px icons rendered white inside the pin head
  hospital: '<path d="M8 4v8M4 8h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  event:
    '<rect x="3" y="4" width="10" height="9" rx="1.5" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M3 7h10M6 2.5v2M10 2.5v2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
  need: '<path d="M8 13s-4.5-3-4.5-6A2.5 2.5 0 0 1 8 5a2.5 2.5 0 0 1 4.5 2c0 3-4.5 6-4.5 6z" fill="#fff"/>',
  partner:
    '<circle cx="5.5" cy="6" r="1.8" fill="#fff"/><circle cx="10.5" cy="6" r="1.8" fill="#fff"/><path d="M3 12c0-1.6 1.2-2.6 2.5-2.6S8 10.4 8 12M8 12c0-1.6 1.2-2.6 2.5-2.6S13 10.4 13 12" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
};

function pinSvg(hex: string, glyph?: PinGlyph): string {
  const inner = glyph
    ? `<g transform="translate(7 6)">${GLYPHS[glyph]}</g>`
    : `<circle cx="15" cy="15" r="6" fill="#fff"/>`;
  return `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13.4 25.2 14 25.8a1.4 1.4 0 0 0 2 0C16.6 40.2 30 25.5 30 15 30 6.7 23.3 0 15 0z" fill="${hex}"/>
    ${inner}
  </svg>`;
}

const iconCache = new Map<string, L.DivIcon>();

/** A colored teardrop pin, optionally with a category glyph and an active state. */
export function pinIcon(
  color: PinColor = "green",
  opts: { active?: boolean; glyph?: PinGlyph } = {},
): L.DivIcon {
  const { active = false, glyph } = opts;
  const key = `${color}|${glyph ?? ""}|${active ? "a" : ""}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  // Active markers use the navy accent and a larger footprint.
  const hex = active ? PIN_COLORS.navy : PIN_COLORS[color];
  const scale = active ? 1.25 : 1;
  const w = Math.round(30 * scale);
  const h = Math.round(42 * scale);
  const icon = L.divIcon({
    html: pinSvg(hex, glyph),
    className: `wy-pin${active ? " wy-pin--active" : ""}`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 4],
  });
  iconCache.set(key, icon);
  return icon;
}

/** Brand-green cluster bubble, sized by the number of contained markers. */
export function clusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 36 : count < 100 ? 44 : 52;
  return L.divIcon({
    html: `<div class="wy-cluster" style="width:${size}px;height:${size}px"><span>${count}</span></div>`,
    className: "wy-cluster-wrap",
    iconSize: [size, size],
  });
}

/** "You are here" dot with a soft accuracy halo (pulse via CSS, motion-safe). */
export function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    html: '<span class="wy-userloc"><span class="wy-userloc__ring"></span><span class="wy-userloc__dot"></span></span>',
    className: "wy-userloc-wrap",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export { L };

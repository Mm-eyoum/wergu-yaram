/**
 * Shared Leaflet configuration. Imported by every map component so the CSS and
 * marker icons are set up exactly once. Uses inline SVG `divIcon`s so the markers,
 * clusters and the user-location dot stay on-brand and avoid the classic bundler
 * issue with Leaflet's default marker image paths.
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { categoryStyle } from "@/lib/facilityTaxonomy";

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
export type PinGlyph =
  | "hospital"
  | "event"
  | "need"
  | "partner"
  | "clinic"
  | "stethoscope"
  | "tooth"
  | "pharmacy"
  | "flask"
  | "scan"
  | "baby"
  | "eye"
  | "plus";

const GLYPHS: Record<PinGlyph, string> = {
  // simplified, centered ~10px icons rendered white inside the pin head
  hospital: '<rect x="3" y="3" width="10" height="10" rx="1.5" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M8 5.5v5M5.5 8h5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
  event:
    '<rect x="3" y="4" width="10" height="9" rx="1.5" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M3 7h10M6 2.5v2M10 2.5v2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
  need: '<path d="M8 13s-4.5-3-4.5-6A2.5 2.5 0 0 1 8 5a2.5 2.5 0 0 1 4.5 2c0 3-4.5 6-4.5 6z" fill="#fff"/>',
  partner:
    '<circle cx="5.5" cy="6" r="1.8" fill="#fff"/><circle cx="10.5" cy="6" r="1.8" fill="#fff"/><path d="M3 12c0-1.6 1.2-2.6 2.5-2.6S8 10.4 8 12M8 12c0-1.6 1.2-2.6 2.5-2.6S13 10.4 13 12" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  plus: '<path d="M8 4v8M4 8h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  clinic: '<path d="M4 13V6l4-3 4 3v7" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 7.5v3M6.5 9h3" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
  stethoscope:
    '<path d="M4 3v3a2.5 2.5 0 0 0 5 0V3" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><path d="M6.5 8.5v1.5a3 3 0 0 0 5 0" fill="none" stroke="#fff" stroke-width="1.4"/><circle cx="11.5" cy="9.5" r="1.4" fill="#fff"/>',
  tooth:
    '<path d="M4 4.5C4 3 5.5 3 6.5 3.6c.9.5 2.1.5 3 0C10.5 3 12 3 12 4.5c0 2-1 3-1.3 5.5-.2 1.6-1.4 1.6-1.6 0-.1-1-.3-1.8-1.1-1.8s-1 .8-1.1 1.8c-.2 1.6-1.4 1.6-1.6 0C5 7.5 4 6.5 4 4.5z" fill="#fff"/>',
  pharmacy: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M8 5.2v5.6M5.2 8h5.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
  flask:
    '<path d="M6.5 2.5v3.5L4 11.5a1 1 0 0 0 .9 1.5h6.2a1 1 0 0 0 .9-1.5L9.5 6V2.5" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M6 2.5h4" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
  scan:
    '<path d="M3 6V4.5A1.5 1.5 0 0 1 4.5 3H6M10 3h1.5A1.5 1.5 0 0 1 13 4.5V6M13 10v1.5a1.5 1.5 0 0 1-1.5 1.5H10M6 13H4.5A1.5 1.5 0 0 1 3 11.5V10" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
  baby: '<circle cx="8" cy="6" r="2.4" fill="#fff"/><path d="M4.5 13c0-2 1.6-3.4 3.5-3.4S11.5 11 11.5 13" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
  eye: '<path d="M2.5 8S4.5 4.5 8 4.5 13.5 8 13.5 8 11.5 11.5 8 11.5 2.5 8 2.5 8z" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="8" cy="8" r="1.6" fill="#fff"/>',
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

/** Build (and cache) a teardrop pin from a raw hex color + optional glyph. */
function buildIcon(hex: string, glyph: PinGlyph | undefined, active: boolean): L.DivIcon {
  const key = `${hex}|${glyph ?? ""}|${active ? "a" : ""}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const fill = active ? PIN_COLORS.navy : hex;
  const scale = active ? 1.25 : 1;
  const w = Math.round(30 * scale);
  const h = Math.round(42 * scale);
  const icon = L.divIcon({
    html: pinSvg(fill, glyph),
    className: `wy-pin${active ? " wy-pin--active" : ""}`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 4],
  });
  iconCache.set(key, icon);
  return icon;
}

/** A colored teardrop pin, optionally with a category glyph and an active state. */
export function pinIcon(
  color: PinColor = "green",
  opts: { active?: boolean; glyph?: PinGlyph } = {},
): L.DivIcon {
  return buildIcon(PIN_COLORS[color], opts.glyph, opts.active ?? false);
}

/**
 * A pin styled by health-structure category (color + glyph from the taxonomy).
 * Unclaimed directory entries can override the color to amber via `opts.amber`.
 */
export function categoryPinIcon(
  category: string | undefined,
  opts: { active?: boolean; amber?: boolean } = {},
): L.DivIcon {
  const style = categoryStyle(category);
  const hex = opts.amber ? PIN_COLORS.amber : style.color;
  return buildIcon(hex, style.glyph, opts.active ?? false);
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

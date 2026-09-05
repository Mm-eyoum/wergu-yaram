/**
 * Per-tenant accent theming helpers.
 *
 * A partner space is recoloured with its `theme.accent`. These helpers keep the
 * accent usable on white surfaces (contrast guard) and derive soft tints for
 * chips/section icons — so each space looks distinct while staying readable.
 */

const FALLBACK = "#007A5E"; // brand-green — always AA on white.

/** Parse #RGB / #RRGGBB → [r,g,b] (0–255), or null if unparseable. */
function toRgb(hex?: string): [number, number, number] | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** WCAG relative luminance (0 = black, 1 = white). */
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * Accent safe for both white-text-on-accent (buttons) and accent-text-on-white
 * (labels). Too-light accents fall back to brand-green so text stays legible.
 */
export function safeAccent(accent?: string): string {
  const rgb = toRgb(accent);
  if (!rgb) return FALLBACK;
  return luminance(rgb) > 0.55 ? FALLBACK : (accent as string);
}

/** `rgba()` from a hex + alpha — used for soft chip/section-icon backgrounds. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = toRgb(hex);
  if (!rgb) return `rgba(0,122,94,${alpha})`;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** Convenience bundle for a tenant accent: solid color + soft tint. */
export function accentTheme(accent?: string) {
  const solid = safeAccent(accent);
  return {
    solid,
    soft: withAlpha(solid, 0.1),
    softer: withAlpha(solid, 0.06),
    /** Style for an accent-tinted icon chip (bg + colored glyph). */
    chip: { backgroundColor: withAlpha(solid, 0.12), color: solid } as React.CSSProperties,
    /** Style for a solid accent button (white text). */
    button: { backgroundColor: solid, color: "#fff" } as React.CSSProperties,
    /** Accent-colored text. */
    text: { color: solid } as React.CSSProperties,
  };
}

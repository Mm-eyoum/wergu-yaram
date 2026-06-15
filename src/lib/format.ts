/** Formatting helpers — French / Senegal locale (FCFA, dates). */

const FCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** "30 000 000 FCFA" */
export function formatFcfa(amount: number): string {
  return `${FCFA.format(Math.round(amount))} FCFA`;
}

/** Compact "30 M" / "1,2 k" style for stats. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** "14 juin 2026" */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "14 juin" (no year) — used in compact event chips. */
export function formatDayMonth(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

/** Split a date for calendar-style chips: { day: "24", month: "JUIN" }. */
export function dateChip(iso: string): { day: string; month: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: "--", month: "" };
  const day = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("fr-FR", { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
  return { day, month };
}

/** Percentage (0-100) clamped, rounded. */
export function percent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

/** Initials from a full name: "Aïssatou Diop" -> "AD". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

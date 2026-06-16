/**
 * Shared building blocks for the card system. Centralizes the visual language
 * (media + fallback, glass overlay badges, meta rows, mini-pills) and the
 * interaction rules (hover lift, focus ring, reduced-motion) so every card stays
 * consistent with the platform charter.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Standard classes for an interactive (clickable) card. Applied to the root
 * `<Link>`/`<article>`: soft surface, hover lift + shadow, keyboard focus ring,
 * and reduced-motion fallback.
 */
export const cardInteractive =
  "card-surface group transition-all hover:-translate-y-0.5 hover:shadow-card " +
  "focus-visible:outline-none focus-visible:shadow-focus " +
  "motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const MEDIA_HEIGHT = { sm: "h-32", md: "h-36", lg: "h-40" } as const;

/** Cover image with hover zoom, a robust icon fallback, and overlay slots. */
export function CardMedia({
  src,
  alt = "",
  fallback,
  height = "md",
  overlayTopLeft,
  overlayTopRight,
  children,
}: {
  src?: string | null;
  alt?: string;
  fallback: ReactNode;
  height?: keyof typeof MEDIA_HEIGHT;
  overlayTopLeft?: ReactNode;
  overlayTopRight?: ReactNode;
  /** Extra absolutely-positioned content (e.g. a play overlay or scrim). */
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden", MEDIA_HEIGHT[height])}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-brand-mint text-brand-green">
          {fallback}
        </div>
      )}
      {children}
      {overlayTopLeft && (
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">{overlayTopLeft}</div>
      )}
      {overlayTopRight && (
        <div className="absolute right-3 top-3 flex flex-wrap items-center gap-1.5">{overlayTopRight}</div>
      )}
    </div>
  );
}

/** "Glass" pill shown on top of a cover image (rating, urgency, source…). */
export function OverlayBadge({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-text-primary shadow-soft backdrop-blur",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Inline icon + text used for location / time / reading-time meta lines. */
export function MetaItem({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-text-secondary", className)}>
      {icon}
      {children}
    </span>
  );
}

/** Micro-pill for tags / specialties. */
export function MiniPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-text-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Render up to `max` strings as pills, with a "+N" overflow pill. */
export function PillList({ items, max = 2 }: { items: string[]; max?: number }) {
  if (!items.length) return null;
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((t) => (
        <MiniPill key={t}>{t}</MiniPill>
      ))}
      {extra > 0 && <MiniPill>+{extra}</MiniPill>}
    </div>
  );
}

/** A small button-styled span used as a CTA *inside* a card-wide link (no nested <a>). */
export function CardCta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-green px-3.5 text-sm font-semibold text-white transition-colors group-hover:bg-brand-greenDark",
        className,
      )}
    >
      {children}
    </span>
  );
}

import { useEffect, useRef, useState } from "react";

/** True when the user asked the OS to reduce motion (SSR-safe). */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Count from 0 → `target` once the element scrolls into view. Returns the live
 * value and a ref to attach. Honours `prefers-reduced-motion` (jumps to the
 * final value) and only animates numeric targets.
 */
function useCountUp(target: number, durationMs = 1100) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || target <= 0) {
      setValue(target);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / durationMs);
          // easeOutCubic for a lively-but-settling count.
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return { value, ref };
}

export interface CountUpStatProps {
  /** Numeric targets count up; strings render verbatim. */
  value: number | string;
  label: string;
  icon?: React.ReactNode;
  /** CSS color override for the value (e.g. a tenant accent). */
  accent?: string;
}

/** Impact tile with an animated counter, matching the TrustStatsBar look. */
export function CountUpStat({ value, label, icon, accent }: CountUpStatProps) {
  const numeric = typeof value === "number";
  const { value: animated, ref } = useCountUp(numeric ? value : 0);
  const display = numeric ? animated.toLocaleString("fr-FR") : value;

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-border-soft bg-white p-4 text-center shadow-soft transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {icon && (
        <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-brand-mint text-brand-green">
          {icon}
        </div>
      )}
      <p className="text-2xl font-extrabold text-brand-green" style={accent ? { color: accent } : undefined}>
        {display}
      </p>
      <p className="mt-0.5 text-xs text-text-secondary">{label}</p>
    </div>
  );
}

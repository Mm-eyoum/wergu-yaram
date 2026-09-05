import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
}

/**
 * Build the list of page tokens to display, collapsing long ranges with "…".
 * Always shows the first and last page plus a window around the current one.
 */
function pageTokens(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const tokens: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) tokens.push("…");
  for (let p = start; p <= end; p++) tokens.push(p);
  if (end < pageCount - 1) tokens.push("…");
  tokens.push(pageCount);
  return tokens;
}

/** Numbered pagination control. Renders nothing for a single page. */
export function Pagination({ page, pageCount, onChange, className }: PaginationProps) {
  const { t } = useTranslation();
  if (pageCount <= 1) return null;

  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), pageCount);
    if (next !== page) {
      onChange(next);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const cell =
    "grid h-9 min-w-9 place-items-center rounded-xl border px-3 text-sm font-semibold transition-colors";

  return (
    <nav className={cn("flex flex-wrap items-center justify-center gap-1.5", className)} aria-label={t("pagination.label")}>
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label={t("pagination.prev")}
        className={cn(cell, "border-border-soft text-text-secondary hover:border-brand-teal hover:text-brand-green disabled:opacity-40 disabled:hover:border-border-soft disabled:hover:text-text-secondary")}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageTokens(page, pageCount).map((token, i) =>
        token === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-text-secondary">
            …
          </span>
        ) : (
          <button
            key={token}
            type="button"
            onClick={() => go(token)}
            aria-current={token === page ? "page" : undefined}
            className={cn(
              cell,
              token === page
                ? "border-brand-green bg-brand-green text-white"
                : "border-border-soft text-text-secondary hover:border-brand-teal hover:text-brand-green",
            )}
          >
            {token}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page === pageCount}
        aria-label={t("pagination.next")}
        className={cn(cell, "border-border-soft text-text-secondary hover:border-brand-teal hover:text-brand-green disabled:opacity-40 disabled:hover:border-border-soft disabled:hover:text-text-secondary")}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

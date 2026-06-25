import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  Compass,
  FileText,
  GraduationCap,
  Hospital,
  Pill,
  PlayCircle,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { EXPLORE_CATEGORIES } from "@/lib/constants";
import type { ContentType } from "@/types/domain";

const ICONS: Record<string, React.ReactNode> = {
  pathologie: <Activity className="h-5 w-5" />,
  medicament: <Pill className="h-5 w-5" />,
  symptome: <Stethoscope className="h-5 w-5" />,
  etablissement: <Hospital className="h-5 w-5" />,
  article: <FileText className="h-5 w-5" />,
  video: <PlayCircle className="h-5 w-5" />,
  formation: <GraduationCap className="h-5 w-5" />,
};

/** True when the user is currently viewing this category's search tab. */
function useActiveType(): ContentType | null {
  const { pathname, search } = useLocation();
  if (pathname !== "/recherche") return null;
  return (new URLSearchParams(search).get("type") as ContentType) ?? null;
}

function ExploreItem({
  category,
  active,
  onClick,
}: {
  category: (typeof EXPLORE_CATEGORIES)[number];
  active: boolean;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Link
      to={category.to}
      onClick={onClick}
      className={cn(
        "group/item flex items-center gap-3 rounded-2xl p-2.5 transition-colors",
        active ? "bg-brand-mint" : "hover:bg-brand-mint",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors",
          active
            ? "bg-brand-green text-white"
            : "bg-brand-mint text-brand-green group-hover/item:bg-brand-green group-hover/item:text-white",
        )}
      >
        {ICONS[category.key]}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-text-primary">{t(`contentTypes.${category.key}`)}</span>
        <span className="block truncate text-xs text-text-secondary">{t(`explore.desc.${category.key}`)}</span>
      </span>
    </Link>
  );
}

/** Desktop "Explorer" trigger + animated 2-column mega-menu. */
export function ExploreMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const activeType = useActiveType();

  function openNow() {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          open || activeType
            ? "bg-brand-mint text-brand-green"
            : "text-text-secondary hover:bg-brand-soft hover:text-brand-green",
        )}
      >
        <Compass className="h-4 w-4" />
        {t("explore.trigger")}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-40 mt-2 w-[480px] -translate-x-1/2 origin-top rounded-3xl border border-border-soft bg-white p-3 shadow-card animate-fade-in"
        >
          <p className="px-2.5 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {t("explore.heading")}
          </p>
          <div className="grid grid-cols-2 gap-1">
            {EXPLORE_CATEGORIES.map((cat) => (
              <ExploreItem
                key={cat.key}
                category={cat}
                active={activeType === cat.key}
                onClick={() => setOpen(false)}
              />
            ))}
          </div>
          <Link
            to="/recherche"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center justify-between rounded-2xl bg-brand-soft px-3.5 py-2.5 text-sm font-semibold text-brand-green transition-colors hover:bg-brand-mint"
          >
            {t("explore.seeAllPortal")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

/** Mobile collapsible "Explorer" section for the header drawer. */
export function ExploreAccordion({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const activeType = useActiveType();

  return (
    <div className="rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-brand-mint"
      >
        <span className="inline-flex items-center gap-2">
          <Compass className="h-4 w-4 text-brand-green" />
          {t("explore.trigger")}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1 grid grid-cols-1 gap-1 pl-1 animate-fade-in sm:grid-cols-2">
          {EXPLORE_CATEGORIES.map((cat) => (
            <ExploreItem
              key={cat.key}
              category={cat}
              active={activeType === cat.key}
              onClick={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

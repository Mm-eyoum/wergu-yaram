import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { searchContent } from "@/services/content";
import type { SearchHit } from "@/types/domain";
import { useDebounce } from "@/hooks/useDebounce";

interface UniversalSearchBarProps {
  size?: "hero" | "compact";
  defaultValue?: string;
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

const TYPE_LABEL: Record<string, string> = {
  pathologie: "Pathologie",
  medicament: "Médicament",
  symptome: "Symptôme",
  article: "Article",
  video: "Vidéo",
  etablissement: "Établissement",
  communaute: "Communauté",
  evenement: "Événement",
  besoin: "Besoin",
  partenaire: "Partenaire",
};

/** The universal health search — routes to /recherche and offers live suggestions. */
export function UniversalSearchBar({
  size = "hero",
  defaultValue = "",
  className,
  autoFocus,
  placeholder = "Rechercher un médicament, une pathologie, un symptôme, une structure…",
}: UniversalSearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(query, 180);

  const suggestions: SearchHit[] = debounced.trim().length >= 2 ? searchContent(debounced).slice(0, 6) : [];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    navigate(`/recherche?q=${encodeURIComponent(trimmed)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") submit(query);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0) navigate(suggestions[active].href);
      else submit(query);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const isHero = size === "hero";

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border bg-white transition-shadow",
          isHero ? "border-border-soft p-1.5 pl-5 shadow-card" : "border-border-soft p-1 pl-4 shadow-sm",
          open && "ring-2 ring-brand-teal/30",
        )}
      >
        <Search className={cn("shrink-0 text-text-secondary", isHero ? "h-5 w-5" : "h-4 w-4")} />
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Recherche santé universelle"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-text-primary placeholder:text-text-secondary/70 focus:outline-none",
            isHero ? "h-11 text-base" : "h-9 text-sm",
          )}
        />
        <button
          type="button"
          onClick={() => submit(query)}
          className={cn(
            "shrink-0 rounded-full bg-brand-green font-semibold text-white transition-colors hover:bg-brand-teal",
            isHero ? "h-11 px-6 text-sm" : "h-9 px-4 text-sm",
          )}
        >
          Rechercher
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border-soft bg-white py-1.5 shadow-card animate-fade-in">
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  setOpen(false);
                  navigate(s.href);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left",
                  active === i ? "bg-brand-mint" : "hover:bg-brand-soft",
                )}
              >
                <Search className="h-4 w-4 shrink-0 text-text-secondary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{s.title}</span>
                  <span className="block truncate text-xs text-text-secondary">{s.description}</span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                  {TYPE_LABEL[s.type]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

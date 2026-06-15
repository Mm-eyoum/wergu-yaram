import { CategoryPill } from "@/components/ui/CategoryPill";
import { QUICK_SHORTCUTS } from "@/lib/constants";
import { UniversalSearchBar } from "./UniversalSearchBar";

interface UniversalSearchHeroProps {
  title?: React.ReactNode;
  subtitle?: string;
  defaultValue?: string;
  showShortcuts?: boolean;
  compact?: boolean;
}

const SHORTCUT_LINKS: Record<string, string> = {
  Diabète: "/recherche?q=diab%C3%A8te",
  Hypertension: "/pathologies/hypertension-arterielle",
  Paracétamol: "/medicaments/paracetamol-500mg",
  Asthme: "/recherche?q=asthme",
  "Trouver une structure": "/recherche?type=etablissement",
  "Soutenir un besoin": "/besoins",
};

/** Mint hero with the central universal search bar (home + search results). */
export function UniversalSearchHero({
  title,
  subtitle = "Votre moteur de recherche santé au Sénégal",
  defaultValue,
  showShortcuts = true,
  compact = false,
}: UniversalSearchHeroProps) {
  return (
    <section className="bg-mint-fade">
      <div className={`container-page text-center ${compact ? "py-10" : "py-16 lg:py-20"}`}>
        <h1
          className={`mx-auto max-w-3xl font-extrabold leading-tight ${
            compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl lg:text-5xl"
          }`}
        >
          {title ?? (
            <>
              Recherchez une information santé{" "}
              <span className="text-brand-green">fiable, simplement.</span>
            </>
          )}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary sm:text-base">{subtitle}</p>

        <div className="mx-auto mt-7 max-w-2xl">
          <UniversalSearchBar size="hero" defaultValue={defaultValue} />
        </div>

        {showShortcuts && (
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {QUICK_SHORTCUTS.map((label) => (
              <CategoryPill key={label} label={label} to={SHORTCUT_LINKS[label] ?? "/recherche"} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

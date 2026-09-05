import { useTranslation } from "react-i18next";
import { CategoryPill } from "@/components/ui/CategoryPill";
import { UniversalSearchBar } from "./UniversalSearchBar";

interface UniversalSearchHeroProps {
  title?: React.ReactNode;
  subtitle?: string;
  defaultValue?: string;
  showShortcuts?: boolean;
  compact?: boolean;
}

/** Quick shortcuts: stable i18n key + destination (label translated at render). */
const SHORTCUTS: { key: string; to: string }[] = [
  { key: "diabetes", to: "/recherche?q=diab%C3%A8te" },
  { key: "hypertension", to: "/pathologies/hypertension-arterielle" },
  { key: "paracetamol", to: "/medicaments/paracetamol-500mg" },
  { key: "asthma", to: "/recherche?q=asthme" },
  { key: "findFacility", to: "/recherche?type=etablissement" },
  { key: "supportNeed", to: "/besoins" },
];

/** Mint hero with the central universal search bar (home + search results). */
export function UniversalSearchHero({
  title,
  subtitle,
  defaultValue,
  showShortcuts = true,
  compact = false,
}: UniversalSearchHeroProps) {
  const { t } = useTranslation();
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
              {t("hero.titleLead")}{" "}
              <span className="text-brand-green">{t("hero.titleHighlight")}</span>
            </>
          )}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary sm:text-base">
          {subtitle ?? t("hero.subtitle")}
        </p>

        <div className="mx-auto mt-7 max-w-2xl">
          <UniversalSearchBar size="hero" defaultValue={defaultValue} />
        </div>

        {showShortcuts && (
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {SHORTCUTS.map((s) => (
              <CategoryPill key={s.key} label={t(`shortcuts.${s.key}`)} to={s.to} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

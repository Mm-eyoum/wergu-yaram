import { useTranslation } from "react-i18next";
import { ButtonLink } from "@/components/ui/Button";
import { UniversalSearchBar } from "@/components/search/UniversalSearchBar";
import { SEOHead } from "@/seo/SEOHead";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <SEOHead title={t("notFound.seoTitle")} noIndex />
      <span className="text-6xl font-extrabold text-brand-green">404</span>
      <h1 className="mt-3 text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">{t("notFound.text")}</p>
      <div className="mt-6 w-full max-w-lg">
        <UniversalSearchBar size="hero" />
      </div>
      <ButtonLink to="/" variant="outline" className="mt-5">
        {t("notFound.home")}
      </ButtonLink>
    </div>
  );
}

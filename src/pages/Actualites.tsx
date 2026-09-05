import { useMemo, useState } from "react";
import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useArticles } from "@/hooks/useCatalog";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

/**
 * Public list of articles/vidéos (actualités & ressources) — the main-domain
 * "corresponding page" for articles (incl. partner-created ones, which carry a
 * « Proposé par … » attribution via ArticleCard).
 */
export default function Actualites() {
  const { data: articles, isLoading, isError, refetch } = useArticles();
  const [category, setCategory] = useState("");

  const categories = useMemo(
    () => Array.from(new Set((articles ?? []).map((a) => a.category).filter(Boolean))) as string[],
    [articles],
  );
  const filtered = useMemo(
    () => (articles ?? []).filter((a) => !category || a.category === category),
    [articles, category],
  );

  return (
    <div>
      <SEOHead
        title="Actualités & ressources santé"
        description="Articles et vidéos santé vérifiés : prévention, pathologies, conseils — par Wergu Yaram et ses partenaires."
        canonicalPath="/actualites"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Actualités", path: "/actualites" },
        ])}
      />
      <UniversalSearchHero
        compact
        showShortcuts={false}
        title={<>Actualités <span className="text-brand-green">& ressources</span></>}
        subtitle="Articles et vidéos santé vérifiés — prévention, pathologies, conseils."
      />
      <div className="container-page py-10">
        {categories.length > 0 && (
          <div className="mb-6 max-w-xs">
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none"
            >
              <option value="">Toutes</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Aucune actualité" message="Le contenu sera bientôt disponible." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => <ArticleCard key={a.slug} article={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}

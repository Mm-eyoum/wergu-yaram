import { BookOpen } from "lucide-react";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { TenantPageHeader, EmptyHint } from "@/components/tenant/TenantUI";
import { useTenant } from "@/hooks/useTenant";
import { useTenantArticles } from "@/hooks/useCatalog";
import { SEOHead } from "@/seo/SEOHead";

export default function TenantResources() {
  const { tenant, slug } = useTenant();
  const { data: items = [], isLoading } = useTenantArticles(slug ?? undefined);

  return (
    <div className="container-page space-y-6 py-8">
      <SEOHead title={`Ressources — ${tenant?.name ?? "Espace partenaire"}`} description={`Articles et ressources publiés par ${tenant?.name ?? "ce partenaire"}.`} />
      <TenantPageHeader
        title="Ressources & articles"
        subtitle="Contenus fiables et conseils santé du partenaire."
        accent={tenant?.theme?.accent}
        icon={<BookOpen className="h-5 w-5" />}
      />
      {isLoading ? (
        <LoadingState />
      ) : items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      ) : (
        <EmptyHint message="Les ressources de cet espace seront publiées prochainement." />
      )}
    </div>
  );
}

import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCommunities } from "@/hooks/useCatalog";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

export default function Communities() {
  const { data: communities, isLoading, isError } = useCommunities();
  return (
    <div>
      <SEOHead
        title="Communautés santé"
        description="Rejoignez des espaces d'entraide bienveillants autour de votre santé : diabète, hypertension, santé maternelle et plus encore."
        canonicalPath="/communautes"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Communautés", path: "/communautes" },
        ])}
      />
      <UniversalSearchHero
        compact
        showShortcuts={false}
        title={
          <>
            Communautés <span className="text-brand-green">santé</span>
          </>
        }
        subtitle="Rejoignez des espaces d'entraide bienveillants autour de votre santé."
      />
      <div className="container-page py-10">
        {isLoading ? (
          <LoadingState label="Chargement des communautés…" />
        ) : isError ? (
          <EmptyState
            title="Communautés indisponibles"
            message="Une erreur est survenue lors du chargement. Réessayez plus tard."
          />
        ) : !communities || communities.length === 0 ? (
          <EmptyState
            title="Aucune communauté"
            message="Aucune communauté n'est disponible pour le moment."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((c) => (
              <CommunityCard key={c.slug} community={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

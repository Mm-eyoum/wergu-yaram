import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { EventCard } from "@/components/cards/EventCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEvents } from "@/hooks/useCatalog";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

export default function Evenements() {
  const { data: events, isLoading, isError } = useEvents();
  return (
    <div>
      <SEOHead
        title="Événements santé"
        description="Ateliers, webinaires et journées de sensibilisation santé près de chez vous au Sénégal."
        canonicalPath="/evenements"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Événements", path: "/evenements" },
        ])}
      />
      <UniversalSearchHero
        compact
        showShortcuts={false}
        title={
          <>
            Événements <span className="text-brand-green">santé</span>
          </>
        }
        subtitle="Ateliers, webinaires et journées de sensibilisation près de chez vous."
      />
      <div className="container-page py-10">
        {isLoading ? (
          <LoadingState label="Chargement des événements…" />
        ) : isError ? (
          <EmptyState
            title="Événements indisponibles"
            message="Une erreur est survenue lors du chargement. Réessayez plus tard."
          />
        ) : !events || events.length === 0 ? (
          <EmptyState title="Aucun événement" message="Aucun événement n'est programmé pour le moment." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

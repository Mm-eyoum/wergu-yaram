import { Calendar } from "lucide-react";
import { EventPosterCard } from "@/components/cards/EventPosterCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { TenantPageHeader, EmptyHint } from "@/components/tenant/TenantUI";
import { useTenant } from "@/hooks/useTenant";
import { useTenantEvents } from "@/hooks/useCatalog";
import { SEOHead } from "@/seo/SEOHead";

export default function TenantEvents() {
  const { tenant, slug } = useTenant();
  const { data: items = [], isLoading } = useTenantEvents(slug ?? undefined);

  return (
    <div className="container-page space-y-6 py-8">
      <SEOHead title={`Événements — ${tenant?.name ?? "Espace partenaire"}`} description={`Les événements organisés par ${tenant?.name ?? "ce partenaire"}.`} />
      <TenantPageHeader
        title="Événements"
        subtitle="Ateliers, dépistages et rencontres à venir."
        accent={tenant?.theme?.accent}
        icon={<Calendar className="h-5 w-5" />}
      />
      {isLoading ? (
        <LoadingState />
      ) : items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <EventPosterCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <EmptyHint message="Aucun événement programmé pour le moment. Revenez bientôt !" />
      )}
    </div>
  );
}

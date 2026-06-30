import { Users } from "lucide-react";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { TenantPageHeader, EmptyHint } from "@/components/tenant/TenantUI";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCommunities } from "@/hooks/useCatalog";
import { SEOHead } from "@/seo/SEOHead";

export default function TenantCommunities() {
  const { tenant, slug } = useTenant();
  const { data: items = [], isLoading } = useTenantCommunities(slug ?? undefined);

  return (
    <div className="container-page space-y-6 py-8">
      <SEOHead title={`Communautés — ${tenant?.name ?? "Espace partenaire"}`} description={`Les communautés animées par ${tenant?.name ?? "ce partenaire"}.`} />
      <TenantPageHeader
        title="Communautés"
        subtitle="Des espaces d'entraide animés par le partenaire."
        accent={tenant?.theme?.accent}
        icon={<Users className="h-5 w-5" />}
      />
      {isLoading ? (
        <LoadingState />
      ) : items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CommunityCard key={c.slug} community={c} />
          ))}
        </div>
      ) : (
        <EmptyHint message="Les communautés de cet espace arrivent bientôt." />
      )}
    </div>
  );
}

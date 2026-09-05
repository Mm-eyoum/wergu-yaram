import { HandHeart } from "lucide-react";
import { EquipmentNeedCard } from "@/components/cards/EquipmentNeedCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { TenantPageHeader, SupportBand, EmptyHint } from "@/components/tenant/TenantUI";
import { useTenant } from "@/hooks/useTenant";
import { useTenantEquipmentNeeds } from "@/hooks/useCatalog";
import { useTenantSpace } from "@/hooks/useTenantSpace";
import { resolveTenantCta } from "@/lib/tenantCta";
import { SEOHead } from "@/seo/SEOHead";

export default function TenantSupport() {
  const { tenant, slug } = useTenant();
  const { isLoading } = useTenantEquipmentNeeds(slug ?? undefined);
  const { needs, communities } = useTenantSpace(slug ?? undefined, tenant);
  const accent = tenant?.theme?.accent;
  const cta = resolveTenantCta({ needs, communities, tenant });

  return (
    <div className="container-page space-y-8 py-8">
      <SEOHead title={`Soutenir — ${tenant?.name ?? "Espace partenaire"}`} description={`Soutenez les actions de ${tenant?.name ?? "ce partenaire"}.`} />
      <TenantPageHeader
        title="Soutenir nos actions"
        subtitle="Contribuez aux besoins concrets de santé portés par le partenaire."
        accent={accent}
        icon={<HandHeart className="h-5 w-5" />}
      />

      {isLoading ? (
        <LoadingState />
      ) : needs.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {needs.map((n) => (
            <EquipmentNeedCard key={n.id} need={n} />
          ))}
        </div>
      ) : (
        <EmptyHint message="Aucune campagne de soutien en cours. Rejoignez la communauté pour rester informé." />
      )}

      <SupportBand cta={cta} name={tenant?.name ?? "nous"} accent={accent} />
    </div>
  );
}

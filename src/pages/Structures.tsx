import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin } from "lucide-react";
import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { fetchActiveOrganizationsByType } from "@/services/organizations";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

export default function Structures() {
  const { data: orgs, isLoading, isError } = useQuery({
    queryKey: ["organizations", "active", "healthcare_facility"],
    queryFn: () => fetchActiveOrganizationsByType("healthcare_facility"),
  });

  return (
    <div>
      <SEOHead
        title="Structures de santé"
        description="Annuaire des structures de santé inscrites sur Wergu Yaram : hôpitaux, cliniques, centres et postes de santé au Sénégal."
        canonicalPath="/structures"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Structures", path: "/structures" },
        ])}
      />
      <UniversalSearchHero
        compact
        showShortcuts={false}
        title={
          <>
            Structures <span className="text-brand-green">de santé</span>
          </>
        }
        subtitle="Découvrez les structures de santé inscrites et soutenez leurs besoins."
      />
      <div className="container-page py-10">
        {isLoading ? (
          <LoadingState label="Chargement des structures…" />
        ) : isError ? (
          <EmptyState
            title="Structures indisponibles"
            message="Une erreur est survenue lors du chargement. Réessayez plus tard."
          />
        ) : !orgs || orgs.length === 0 ? (
          <EmptyState
            title="Aucune structure"
            message="Aucune structure n'est encore inscrite. Vous gérez une structure ?"
            action={
              <ButtonLink to="/dashboard/pages/new" size="sm">
                Inscrire ma structure
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <Link
                key={org.id}
                to={`/structures/${org.id}`}
                className="card-surface flex items-start gap-3 p-4 transition-colors hover:border-brand-teal"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-mint text-brand-green">
                  {org.logo ? (
                    <img src={org.logo} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-text-primary">{org.name}</h3>
                  {org.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{org.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="mint">Structure de santé</Badge>
                    {(org.region || org.city) && (
                      <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                        <MapPin className="h-3.5 w-3.5" />
                        {org.city || org.region}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

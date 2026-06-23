import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Clock, MapPin, Phone, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { LazyMapView } from "@/components/map/LazyMapView";
import { DirectionsButton } from "@/components/map/DirectionsButton";
import { fetchOrganization } from "@/services/organizations";
import { fetchFacilityBySourceOrgId } from "@/services/facilities";
import { ORG_TYPE_LABELS } from "@/lib/constants";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

/**
 * Public view of an organization page (partner / donor). Health establishments
 * live in `facilities` (/etablissements/:slug); a legacy `/structures/:id` that
 * pointed at a migrated health structure is redirected there transparently.
 */
export default function OrganizationDetail() {
  const { id } = useParams();

  const orgQuery = useQuery({
    queryKey: ["organization", id],
    queryFn: () => fetchOrganization(id!),
    enabled: !!id,
  });
  const org = orgQuery.data;

  // When no org matches, the id may be a health structure migrated to facilities.
  const legacyQuery = useQuery({
    queryKey: ["facilityBySourceOrg", id],
    queryFn: () => fetchFacilityBySourceOrgId(id!),
    enabled: !!id && !orgQuery.isLoading && !org,
  });

  if (orgQuery.isLoading || (!org && legacyQuery.isLoading)) {
    return <div className="container-page py-16"><LoadingState /></div>;
  }

  if (legacyQuery.data) {
    return <Navigate to={`/etablissements/${legacyQuery.data.slug}`} replace />;
  }

  if (!org) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Page introuvable" noIndex />
        <EmptyState title="Page introuvable" message="Cette page n'existe pas ou a été retirée." />
      </div>
    );
  }

  return (
    <div className="container-page py-6">
      <SEOHead
        title={org.name}
        description={org.description || `${org.name} — ${ORG_TYPE_LABELS[org.type]}`}
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Partenaires", path: "/partenaires" },
          { name: org.name, path: `/structures/${org.id}` },
        ])}
      />

      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary" aria-label="Fil d'Ariane">
        <Link to="/" className="hover:text-brand-green">Accueil</Link>
        <span>›</span>
        <Link to="/partenaires" className="hover:text-brand-green">Partenaires</Link>
        <span>›</span>
        <span className="text-text-primary">{org.name}</span>
      </nav>

      <div className="card-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold">{org.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone="mint">{ORG_TYPE_LABELS[org.type]}</Badge>
              </div>
              {org.address && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4" /> {org.address}
                </p>
              )}
              {org.rating != null && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {org.rating.toFixed(1)}
                </p>
              )}
            </div>
          </div>
          {org.coords && <DirectionsButton to={org.coords} className="sm:w-auto" />}
        </div>

        {org.description && (
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">{org.description}</p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <SectionCard title="Informations pratiques">
            <ul className="space-y-2 text-sm text-text-secondary">
              {org.phone && (
                <li className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4" /> {org.phone}
                </li>
              )}
              {org.hours && (
                <li className="inline-flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" /> {org.hours}
                </li>
              )}
              {org.region && (
                <li className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {org.city ? `${org.city}, ` : ""}{org.region}
                </li>
              )}
            </ul>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          {org.coords && (
            <SectionCard title="Localisation">
              <LazyMapView
                className="h-48 w-full"
                markers={[{ id: org.id, coords: org.coords, title: org.name }]}
                zoom={15}
              />
              <div className="mt-3">
                <DirectionsButton to={org.coords} />
              </div>
            </SectionCard>
          )}
        </aside>
      </div>
    </div>
  );
}

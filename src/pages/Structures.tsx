import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Building2, MapPin } from "lucide-react";
import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { useFacilities } from "@/hooks/useCatalog";
import {
  categoryLabel,
  sectorLabel,
  CATEGORY_OPTIONS,
  SECTOR_OPTIONS,
} from "@/lib/facilityTaxonomy";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

/** Public directory of health establishments (the unified `facilities` model). */
export default function Structures() {
  const { data: facilities, isLoading, isError } = useFacilities();

  const [category, setCategory] = useState("");
  const [sector, setSector] = useState("");

  // Featured-first: Pro establishments, then Vérifié, then the rest.
  const filtered = useMemo(() => {
    const rank = (tier?: string) => (tier === "pro" ? 0 : tier === "verified" ? 1 : 2);
    return (facilities ?? [])
      .filter((f) => (!category || f.category === category) && (!sector || f.sector === sector))
      .sort((a, b) => rank(a.planTier) - rank(b.planTier));
  }, [facilities, category, sector]);

  return (
    <div>
      <SEOHead
        title="Établissements de santé"
        description="Annuaire des établissements de santé au Sénégal : hôpitaux, cliniques, centres et postes de santé. Trouvez et soutenez leurs besoins."
        canonicalPath="/etablissements"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Établissements", path: "/etablissements" },
        ])}
      />
      <UniversalSearchHero
        compact
        showShortcuts={false}
        title={
          <>
            Établissements <span className="text-brand-green">de santé</span>
          </>
        }
        subtitle="Découvrez les établissements de santé référencés et soutenez leurs besoins."
      />
      <div className="container-page py-10">
        {facilities && facilities.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              <option value="">Toutes les catégories</option>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="h-11 rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              <option value="">Tous les secteurs</option>
              {SECTOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {isLoading ? (
          <LoadingState label="Chargement des établissements…" />
        ) : isError ? (
          <EmptyState
            title="Établissements indisponibles"
            message="Une erreur est survenue lors du chargement. Réessayez plus tard."
          />
        ) : !facilities || facilities.length === 0 ? (
          <EmptyState
            title="Aucun établissement"
            message="Aucun établissement n'est encore référencé. Vous gérez une structure ?"
            action={
              <ButtonLink to="/dashboard/pages/new" size="sm">
                Inscrire mon établissement
              </ButtonLink>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Aucun établissement"
            message="Aucun établissement ne correspond à ces filtres."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((facility) => (
              <Link
                key={facility.slug}
                to={`/etablissements/${facility.slug}`}
                className={`card-surface flex items-start gap-3 p-4 transition-colors hover:border-brand-teal ${
                  facility.featured ? "ring-1 ring-brand-green/30" : ""
                }`}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-mint text-brand-green">
                  {facility.cover ? (
                    <img src={facility.cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-1 truncate text-sm font-bold text-text-primary">
                    {facility.name}
                    {(facility.planTier || facility.verified) && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-brand-green" aria-label="Établissement vérifié" />
                    )}
                  </h3>
                  {facility.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{facility.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="mint">{categoryLabel(facility.category) || "Établissement de santé"}</Badge>
                    {sectorLabel(facility.sector) && <Badge tone="navy">{sectorLabel(facility.sector)}</Badge>}
                    {(facility.region || facility.city) && (
                      <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                        <MapPin className="h-3.5 w-3.5" />
                        {facility.city || facility.region}
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

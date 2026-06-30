import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, BadgeCheck, Clock } from "lucide-react";
import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useFormations } from "@/hooks/useCatalog";
import { FORMATION_LEVEL_LABELS, FORMATION_FORMAT_LABELS } from "@/lib/formationLabels";
import { cn } from "@/lib/cn";
import { PartnerAttribution } from "@/components/tenant/PartnerAttribution";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

export default function Formations() {
  const { data: formations, isLoading, isError } = useFormations();
  const [format, setFormat] = useState("");

  const categories = useMemo(
    () => Array.from(new Set((formations ?? []).map((f) => f.category).filter(Boolean))) as string[],
    [formations],
  );
  const [category, setCategory] = useState("");

  const filtered = useMemo(
    () =>
      (formations ?? []).filter(
        (f) => (!format || f.format === format) && (!category || f.category === category),
      ),
    [formations, format, category],
  );

  return (
    <div>
      <SEOHead
        title="Formations santé"
        description="Formations et webinaires e-santé : éducation thérapeutique, prévention, dépistage — pour soignants, aidants et associations."
        canonicalPath="/formations"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Formations", path: "/formations" },
        ])}
      />
      <UniversalSearchHero
        compact
        showShortcuts={false}
        title={<>Formations <span className="text-brand-green">santé</span></>}
        subtitle="Montez en compétence : éducation thérapeutique, prévention, dépistage — en ligne ou en présentiel."
      />
      <div className="container-page py-10">
        {formations && formations.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              <option value="">Tous les thèmes</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="h-11 rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              <option value="">Tous les formats</option>
              {Object.entries(FORMATION_FORMAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}

        {isLoading ? (
          <LoadingState label="Chargement des formations…" />
        ) : isError ? (
          <EmptyState title="Formations indisponibles" message="Une erreur est survenue. Réessayez plus tard." />
        ) : !formations || formations.length === 0 ? (
          <EmptyState title="Aucune formation" message="Aucune formation n'est publiée pour le moment." />
        ) : filtered.length === 0 ? (
          <EmptyState title="Aucune formation" message="Aucune formation ne correspond à ces filtres." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((f) => (
              <Link
                key={f.slug}
                to={`/formations/${f.slug}`}
                className="card-surface group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-mint text-brand-green">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  {f.certification && (
                    <Badge tone="green" icon={<BadgeCheck className="h-3.5 w-3.5" />}>Certifiante</Badge>
                  )}
                </div>
                <h3 className="mt-3 font-bold text-text-primary group-hover:text-brand-green">{f.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{f.excerpt}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {f.category && <Badge tone="mint">{f.category}</Badge>}
                  <Badge tone="navy">{FORMATION_FORMAT_LABELS[f.format]}</Badge>
                  <span className={cn("inline-flex items-center gap-1 text-xs text-text-secondary")}>
                    {FORMATION_LEVEL_LABELS[f.level]}
                  </span>
                  {f.durationLabel && (
                    <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                      <Clock className="h-3.5 w-3.5" /> {f.durationLabel}
                    </span>
                  )}
                </div>
                {f.tenantSlug && <PartnerAttribution tenantSlug={f.tenantSlug} className="mt-2.5" />}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BadgeCheck, CheckCircle2, Clock, GraduationCap, PlayCircle, Users } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useFormation } from "@/hooks/useCatalog";
import { FORMATION_LEVEL_LABELS, FORMATION_FORMAT_LABELS } from "@/lib/formationLabels";
import { useComingSoon } from "@/hooks/useToast";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

export default function FormationDetail() {
  const { t } = useTranslation(["formation", "common"]);
  const { slug } = useParams();
  const { data: formation, isLoading } = useFormation(slug);
  const comingSoon = useComingSoon();

  if (isLoading) {
    return <div className="container-page py-16"><LoadingState label={t("loading")} /></div>;
  }
  if (!formation) {
    return (
      <div className="container-page py-16">
        <SEOHead title={t("notFoundTitle")} noIndex />
        <EmptyState title={t("notFoundTitle")} message={t("notFoundMsg")} />
      </div>
    );
  }

  return (
    <div className="container-page py-6">
      <SEOHead
        title={formation.title}
        description={formation.excerpt}
        ogImage={formation.cover}
        jsonLd={breadcrumbJsonLd([
          { name: t("common:breadcrumb.home"), path: "/" },
          { name: t("common:contentTypes.formation"), path: "/formations" },
          { name: formation.title, path: `/formations/${formation.slug}` },
        ])}
      />
      <Breadcrumb
        items={[
          { label: t("common:breadcrumb.home"), to: "/" },
          { label: t("common:contentTypes.formation"), to: "/formations" },
          { label: formation.title },
        ]}
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="card-surface p-6">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-mint text-brand-green">
              <GraduationCap className="h-6 w-6" />
            </span>
            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{formation.title}</h1>
            <p className="mt-2 text-text-secondary">{formation.excerpt}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {formation.category && <Badge tone="mint">{formation.category}</Badge>}
              <Badge tone="navy">{FORMATION_FORMAT_LABELS[formation.format]}</Badge>
              <Badge tone="outline">{FORMATION_LEVEL_LABELS[formation.level]}</Badge>
              {formation.certification && (
                <Badge tone="green" icon={<BadgeCheck className="h-3.5 w-3.5" />}>{t("certified")}</Badge>
              )}
              {formation.durationLabel && (
                <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
                  <Clock className="h-4 w-4" /> {formation.durationLabel}
                </span>
              )}
            </div>
          </div>

          {formation.objectives.length > 0 && (
            <SectionCard title={t("objectives")}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {formation.objectives.map((o) => (
                  <li key={o} className="flex gap-2 text-sm text-text-secondary">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" /> {o}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {formation.modules.length > 0 && (
            <SectionCard title={t("program")}>
              <ol className="space-y-3">
                {formation.modules.map((m, i) => (
                  <li key={m.title} className="flex gap-3 rounded-2xl border border-border-soft p-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-green/10 text-sm font-bold text-brand-green">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary">{m.title}</p>
                      {m.summary && <p className="text-sm text-text-secondary">{m.summary}</p>}
                      {m.durationLabel && <p className="text-xs text-text-secondary">{m.durationLabel}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}
        </div>

        <aside className="space-y-5">
          <div className="card-surface p-6 lg:sticky lg:top-20">
            <h2 className="text-lg font-bold text-text-primary">{t("enroll")}</h2>
            {formation.audience.length > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-text-secondary">
                <Users className="h-4 w-4" /> {formation.audience.join(", ")}
              </p>
            )}
            {formation.provider?.name && (
              <p className="mt-2 text-sm text-text-secondary">
                {t("byPrefix")} <span className="font-semibold text-text-primary">{formation.provider.name}</span>
                {formation.provider.role ? ` · ${formation.provider.role}` : ""}
              </p>
            )}
            {formation.enrollUrl ? (
              <a
                href={formation.enrollUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white hover:bg-brand-greenDark"
              >
                <GraduationCap className="h-5 w-5" /> {t("access")}
              </a>
            ) : (
              <Button fullWidth size="lg" className="mt-4" onClick={() => comingSoon(t("enrollComingSoon"))}>
                <GraduationCap className="h-5 w-5" /> {t("enroll")}
              </Button>
            )}
            {formation.relatedEventId && (
              <Link
                to={`/evenements/${formation.relatedEventId}`}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border-soft px-4 py-2.5 text-sm font-semibold text-text-secondary hover:border-brand-teal hover:text-brand-green"
              >
                <PlayCircle className="h-4 w-4" /> {t("viewWebinar")}
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Ban,
  HeartPulse,
  Info,
  MapPin,
  MessageCircleQuestion,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Target,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/ui/Card";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TrustBadge } from "@/components/health/TrustBadge";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { PathologyCard } from "@/components/cards/PathologyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useMedication, usePathologies } from "@/hooks/useCatalog";
import { formatDate } from "@/lib/format";
import { useComingSoon } from "@/hooks/useToast";
import { SEOHead } from "@/seo/SEOHead";
import { drugJsonLd, breadcrumbJsonLd } from "@/seo/jsonld";
import { ShareButtons } from "@/components/ShareButtons";
import { FavoriteButton } from "@/components/content/FavoriteButton";
import type { CareLevels, Presentation } from "@/types/domain";

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-text-secondary">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
          {item}
        </li>
      ))}
    </ul>
  );
}

const CARE_LABELS: { key: keyof CareLevels; label: string }[] = [
  { key: "csps", label: "CSPS" },
  { key: "cm", label: "CM" },
  { key: "cma", label: "CMA" },
  { key: "ch", label: "CH" },
];

/** Tableau des présentations : forme, dosage et disponibilité par niveau de soins. */
function PresentationsTable({ presentations }: { presentations: Presentation[] }) {
  const { t } = useTranslation("medication");
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-xs uppercase tracking-wide text-text-secondary">
            <th className="py-2 pr-3 font-semibold">{t("table.form")}</th>
            <th className="py-2 pr-3 font-semibold">{t("table.dosage")}</th>
            {CARE_LABELS.map((c) => (
              <th key={c.key} className="px-2 py-2 text-center font-semibold" title={t(`care.${c.key}`)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {presentations.map((p, i) => (
            <tr key={`${p.form}-${p.dosage ?? i}`} className="border-b border-border-soft/60 align-top">
              <td className="py-2 pr-3 font-medium text-text-primary">
                {p.form}
                {p.note && <span className="mt-0.5 block text-xs font-normal text-text-secondary">{p.note}</span>}
              </td>
              <td className="py-2 pr-3 text-text-secondary">{p.dosage ?? "—"}</td>
              {CARE_LABELS.map((c) => (
                <td key={c.key} className="px-2 py-2 text-center">
                  {p.careLevels[c.key] ? (
                    <span className="font-semibold text-brand-green" aria-label={t("table.available")}>
                      ✓
                    </span>
                  ) : (
                    <span className="text-border" aria-label={t("table.unavailable")}>
                      –
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-text-secondary">{t("table.note")}</p>
    </div>
  );
}

const AWARE_TONE: Record<string, "green" | "warning" | "danger"> = {
  Access: "green",
  Watch: "warning",
  Reserve: "danger",
};

export default function MedicationDetail() {
  const { t } = useTranslation(["medication", "common"]);
  const { slug } = useParams();
  const { data: med, isLoading } = useMedication(slug);
  const { data: pathologies = [] } = usePathologies();
  const comingSoon = useComingSoon();

  if (isLoading) {
    return (
      <div className="container-page py-16">
        <LoadingState label={t("loading")} />
      </div>
    );
  }

  if (!med) {
    return (
      <div className="container-page py-16">
        <SEOHead title={t("notFoundTitle")} noIndex />
        <EmptyState title={t("notFoundTitle")} message={t("notFoundMsg")} />
      </div>
    );
  }

  const relatedPathologies = (med.relatedPathologies ?? [])
    .map((s) => pathologies.find((p) => p.slug === s))
    .filter(Boolean);

  const hasClinical =
    !!med.usage ||
    !!med.posology ||
    (med.contraindications?.length ?? 0) > 0 ||
    (med.sideEffects?.length ?? 0) > 0 ||
    (med.precautions?.length ?? 0) > 0 ||
    (med.interactions?.length ?? 0) > 0 ||
    !!med.professionalAdvice;

  return (
    <div className="container-page py-6">
      <SEOHead
        title={med.dosage ? `${med.name} ${med.dosage}` : med.name}
        description={med.summary}
        ogType="article"
        ogImage={`/og/medicament-${med.slug}.png`}
        section={med.family}
        jsonLd={[
          drugJsonLd(med),
          breadcrumbJsonLd([
            { name: t("common:breadcrumb.home"), path: "/" },
            { name: t("common:contentTypes.medicament"), path: "/recherche?type=medicament" },
            { name: med.name, path: `/medicaments/${med.slug}` },
          ]),
        ]}
      />
      <Breadcrumb
        items={[
          { label: t("common:breadcrumb.home"), to: "/" },
          { label: t("common:contentTypes.medicament"), to: "/recherche?type=medicament" },
          { label: med.name },
        ]}
      />

      {/* Header */}
      <header className="mt-4 flex flex-wrap items-start gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
          <Pill className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              {med.name} {med.dosage && <span className="text-brand-green">{med.dosage}</span>}
            </h1>
            <TrustBadge kind="medical" />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {t("dci")} · {med.dci ?? med.name}
            {med.family ? ` — ${med.family}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {med.essentialMedicine && <Badge tone="mint">{t("badges.essential")}</Badge>}
            {med.awareCategory && (
              <Badge tone={AWARE_TONE[med.awareCategory]}>{t("badges.awareAntibiotic", { cat: med.awareCategory })}</Badge>
            )}
            {med.withoutPrescription ? (
              <Badge tone="green">{t("badges.noPrescription")}</Badge>
            ) : (
              <Badge tone="neutral">{t("badges.prescription")}</Badge>
            )}
            {(med.forms ?? []).map((form) => (
              <Badge key={form} tone="neutral">
                {form}
              </Badge>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FavoriteButton
              type="medicament"
              refId={med.slug}
              title={med.dosage ? `${med.name} ${med.dosage}` : med.name}
              href={`/medicaments/${med.slug}`}
            />
            <ShareButtons
              url={`/medicaments/${med.slug}`}
              title={med.name}
              description={med.summary}
              hashtags={["WerguYaram", "Santé"]}
            />
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main */}
        <div className="space-y-5">
          <MedicalDisclaimer />

          {med.presentations && med.presentations.length > 0 && (
            <SectionCard title={t("sections.presentations")} icon={<Pill className="h-5 w-5" />}>
              <PresentationsTable presentations={med.presentations} />
            </SectionCard>
          )}

          {med.usage && (
            <SectionCard title={t("sections.usage")} icon={<Info className="h-5 w-5" />}>
              <p className="text-sm leading-relaxed text-text-secondary">{med.usage}</p>
            </SectionCard>
          )}

          {med.posology && (
            <SectionCard title={t("sections.posology")} icon={<Target className="h-5 w-5" />}>
              <p className="text-sm leading-relaxed text-text-secondary">{med.posology}</p>
            </SectionCard>
          )}

          {(med.contraindications?.length ?? 0) > 0 && (
            <SectionCard title={t("sections.contraindications")} icon={<Ban className="h-5 w-5" />}>
              <BulletList items={med.contraindications!} />
            </SectionCard>
          )}

          {(med.sideEffects?.length ?? 0) > 0 && (
            <SectionCard title={t("sections.sideEffects")} icon={<AlertTriangle className="h-5 w-5" />}>
              <BulletList items={med.sideEffects!} />
            </SectionCard>
          )}

          {(med.precautions?.length ?? 0) > 0 && (
            <SectionCard title={t("sections.precautions")} icon={<ShieldAlert className="h-5 w-5" />}>
              <BulletList items={med.precautions!} />
            </SectionCard>
          )}

          {(med.interactions?.length ?? 0) > 0 && (
            <SectionCard title={t("sections.interactions")} icon={<HeartPulse className="h-5 w-5" />}>
              <BulletList items={med.interactions!} />
            </SectionCard>
          )}

          {med.professionalAdvice && (
            <SectionCard title={t("sections.advice")} icon={<Stethoscope className="h-5 w-5" />}>
              <div className="rounded-2xl bg-brand-mint p-4 text-sm leading-relaxed text-text-primary">
                {med.professionalAdvice}
              </div>
            </SectionCard>
          )}

          {!hasClinical && (
            <SectionCard title={t("sections.clinicalInfo")} icon={<Info className="h-5 w-5" />}>
              <p className="text-sm leading-relaxed text-text-secondary">{t("clinicalPending")}</p>
            </SectionCard>
          )}

          {(med.clinicalSources?.length ?? 0) > 0 && (
            <p className="text-xs text-text-secondary">
              {t("sourcesPrefix")}{med.clinicalSources!.join(" · ")}
              {med.clinicalReviewStatus === "draft" && t("underReview")}
            </p>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:h-fit">
          <div className="card-surface p-5">
            <h2 className="text-sm font-bold text-text-primary">{t("summary.title")}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {med.pharmacoTherapeuticGroup && (
                <SummaryRow label={t("summary.group")} value={med.pharmacoTherapeuticGroup} />
              )}
              {(med.forms?.length ?? 0) > 0 && <SummaryRow label={t("summary.forms")} value={med.forms.join(", ")} />}
              {med.awareCategory && <SummaryRow label={t("summary.aware")} value={med.awareCategory} />}
              <SummaryRow label={t("summary.prescriptionLabel")} value={med.withoutPrescription ? t("summary.prescriptionNo") : t("summary.prescriptionYes")} />
              {med.trust.updatedAt && <SummaryRow label={t("summary.updated")} value={formatDate(med.trust.updatedAt)} />}
              {med.trust.source && <SummaryRow label={t("summary.source")} value={med.trust.source} />}
            </dl>
            <div className="mt-4 space-y-2">
              <ButtonLink to="/recherche?type=etablissement" fullWidth>
                <MapPin className="h-4 w-4" /> {t("findPharmacy")}
              </ButtonLink>
              <Button
                variant="outline"
                fullWidth
                onClick={() => comingSoon(t("askComingSoon"))}
              >
                <MessageCircleQuestion className="h-4 w-4" /> {t("askQuestion")}
              </Button>
            </div>
          </div>

          {med.regulatory && (
            <SidebarPanel title={t("regulatory.title")}>
              <div className="flex gap-2 text-sm text-text-secondary">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                <div className="space-y-1">
                  <p>{t("regulatory.ref", { edition: med.regulatory.listEdition, authority: med.regulatory.authority })}</p>
                  {med.regulatory.ammRequired && (
                    <p>
                      {t("regulatory.amm", {
                        validity: med.regulatory.ammValidityYears
                          ? t("regulatory.ammValidity", { years: med.regulatory.ammValidityYears })
                          : "",
                      })}
                    </p>
                  )}
                  <p className="text-xs">{t("regulatory.nonPromo")}</p>
                </div>
              </div>
            </SidebarPanel>
          )}

          <SidebarPanel title={t("relatedPathologies")}>
            {relatedPathologies.length > 0 ? (
              <div className="space-y-2">
                {relatedPathologies.map((p) => p && <PathologyCard key={p.slug} pathology={p} />)}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t("noRelated")}</p>
            )}
          </SidebarPanel>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border-soft pb-2 last:border-0 last:pb-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right font-medium text-text-primary">{value}</dd>
    </div>
  );
}

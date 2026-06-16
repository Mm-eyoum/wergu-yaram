import { useParams } from "react-router-dom";
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

const CARE_LABELS: { key: keyof CareLevels; label: string; title: string }[] = [
  { key: "csps", label: "CSPS", title: "Centre de Santé et de Promotion Sociale" },
  { key: "cm", label: "CM", title: "Centre Médical" },
  { key: "cma", label: "CMA", title: "Centre Médical avec Antenne chirurgicale" },
  { key: "ch", label: "CH", title: "Centre Hospitalier" },
];

/** Tableau des présentations : forme, dosage et disponibilité par niveau de soins. */
function PresentationsTable({ presentations }: { presentations: Presentation[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-xs uppercase tracking-wide text-text-secondary">
            <th className="py-2 pr-3 font-semibold">Forme</th>
            <th className="py-2 pr-3 font-semibold">Dosage</th>
            {CARE_LABELS.map((c) => (
              <th key={c.key} className="px-2 py-2 text-center font-semibold" title={c.title}>
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
                    <span className="font-semibold text-brand-green" aria-label="Disponible">
                      ✓
                    </span>
                  ) : (
                    <span className="text-border" aria-label="Non disponible">
                      –
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-text-secondary">
        Niveaux de soins : CSPS · CM · CMA · CH. ✓ = produit prévu à ce niveau (Liste Nationale des Médicaments
        Essentiels).
      </p>
    </div>
  );
}

const AWARE_TONE: Record<string, "green" | "warning" | "danger"> = {
  Access: "green",
  Watch: "warning",
  Reserve: "danger",
};

export default function MedicationDetail() {
  const { slug } = useParams();
  const { data: med, isLoading } = useMedication(slug);
  const { data: pathologies = [] } = usePathologies();
  const comingSoon = useComingSoon();

  if (isLoading) {
    return (
      <div className="container-page py-16">
        <LoadingState label="Chargement de la fiche…" />
      </div>
    );
  }

  if (!med) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Médicament introuvable" noIndex />
        <EmptyState title="Médicament introuvable" message="Cette fiche n'existe pas ou a été déplacée." />
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
            { name: "Accueil", path: "/" },
            { name: "Médicaments", path: "/recherche?type=medicament" },
            { name: med.name, path: `/medicaments/${med.slug}` },
          ]),
        ]}
      />
      <Breadcrumb
        items={[
          { label: "Accueil", to: "/" },
          { label: "Médicaments", to: "/recherche?type=medicament" },
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
            DCI · {med.dci ?? med.name}
            {med.family ? ` — ${med.family}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {med.essentialMedicine && <Badge tone="mint">Médicament essentiel</Badge>}
            {med.awareCategory && (
              <Badge tone={AWARE_TONE[med.awareCategory]}>Antibiotique AWaRe · {med.awareCategory}</Badge>
            )}
            {med.withoutPrescription ? (
              <Badge tone="green">Disponible sans ordonnance</Badge>
            ) : (
              <Badge tone="neutral">Sur ordonnance</Badge>
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
            <SectionCard title="Présentations et niveaux de soins" icon={<Pill className="h-5 w-5" />}>
              <PresentationsTable presentations={med.presentations} />
            </SectionCard>
          )}

          {med.usage && (
            <SectionCard title="À quoi sert ce médicament ?" icon={<Info className="h-5 w-5" />}>
              <p className="text-sm leading-relaxed text-text-secondary">{med.usage}</p>
            </SectionCard>
          )}

          {med.posology && (
            <SectionCard title="Posologie" icon={<Target className="h-5 w-5" />}>
              <p className="text-sm leading-relaxed text-text-secondary">{med.posology}</p>
            </SectionCard>
          )}

          {(med.contraindications?.length ?? 0) > 0 && (
            <SectionCard title="Contre-indications" icon={<Ban className="h-5 w-5" />}>
              <BulletList items={med.contraindications!} />
            </SectionCard>
          )}

          {(med.sideEffects?.length ?? 0) > 0 && (
            <SectionCard title="Effets secondaires" icon={<AlertTriangle className="h-5 w-5" />}>
              <BulletList items={med.sideEffects!} />
            </SectionCard>
          )}

          {(med.precautions?.length ?? 0) > 0 && (
            <SectionCard title="Précautions d'emploi" icon={<ShieldAlert className="h-5 w-5" />}>
              <BulletList items={med.precautions!} />
            </SectionCard>
          )}

          {(med.interactions?.length ?? 0) > 0 && (
            <SectionCard title="Interactions médicamenteuses" icon={<HeartPulse className="h-5 w-5" />}>
              <BulletList items={med.interactions!} />
            </SectionCard>
          )}

          {med.professionalAdvice && (
            <SectionCard title="Le conseil du professionnel de santé" icon={<Stethoscope className="h-5 w-5" />}>
              <div className="rounded-2xl bg-brand-mint p-4 text-sm leading-relaxed text-text-primary">
                {med.professionalAdvice}
              </div>
            </SectionCard>
          )}

          {!hasClinical && (
            <SectionCard title="Information clinique" icon={<Info className="h-5 w-5" />}>
              <p className="text-sm leading-relaxed text-text-secondary">
                La fiche clinique détaillée (usage, posologie, contre-indications, interactions) de ce médicament
                essentiel est <strong>en cours de validation éditoriale</strong>. En attendant, demandez conseil à
                votre pharmacien ou à votre médecin avant toute utilisation. Aucun médicament ne doit être pris sans
                avis professionnel.
              </p>
            </SectionCard>
          )}

          {(med.clinicalSources?.length ?? 0) > 0 && (
            <p className="text-xs text-text-secondary">
              Sources cliniques : {med.clinicalSources!.join(" · ")}
              {med.clinicalReviewStatus === "draft" && " — contenu en cours de revue médicale."}
            </p>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:h-fit">
          <div className="card-surface p-5">
            <h2 className="text-sm font-bold text-text-primary">Résumé</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {med.pharmacoTherapeuticGroup && (
                <SummaryRow label="Groupe" value={med.pharmacoTherapeuticGroup} />
              )}
              {(med.forms?.length ?? 0) > 0 && <SummaryRow label="Formes" value={med.forms.join(", ")} />}
              {med.awareCategory && <SummaryRow label="AWaRe" value={med.awareCategory} />}
              <SummaryRow label="Ordonnance" value={med.withoutPrescription ? "Non requise" : "Requise"} />
              {med.trust.updatedAt && <SummaryRow label="Mise à jour" value={formatDate(med.trust.updatedAt)} />}
              {med.trust.source && <SummaryRow label="Source" value={med.trust.source} />}
            </dl>
            <div className="mt-4 space-y-2">
              <ButtonLink to="/recherche?type=etablissement" fullWidth>
                <MapPin className="h-4 w-4" /> Trouver en pharmacie
              </ButtonLink>
              <Button
                variant="outline"
                fullWidth
                onClick={() => comingSoon("Poser une question à un professionnel arrive bientôt.")}
              >
                <MessageCircleQuestion className="h-4 w-4" /> Poser une question
              </Button>
            </div>
          </div>

          {med.regulatory && (
            <SidebarPanel title="Cadre réglementaire">
              <div className="flex gap-2 text-sm text-text-secondary">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                <div className="space-y-1">
                  <p>
                    Référencé dans la <strong>{med.regulatory.listEdition}</strong> ({med.regulatory.authority}).
                  </p>
                  {med.regulatory.ammRequired && (
                    <p>
                      Toute commercialisation requiert une Autorisation de Mise sur le Marché (AMM)
                      {med.regulatory.ammValidityYears
                        ? `, valable ${med.regulatory.ammValidityYears} ans`
                        : ""}{" "}
                      — Règlement UEMOA N°04/2020.
                    </p>
                  )}
                  <p className="text-xs">Information non promotionnelle, fournie à titre éducatif.</p>
                </div>
              </div>
            </SidebarPanel>
          )}

          <SidebarPanel title="Pathologies liées">
            {relatedPathologies.length > 0 ? (
              <div className="space-y-2">
                {relatedPathologies.map((p) => p && <PathologyCard key={p.slug} pathology={p} />)}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Aucune pathologie liée.</p>
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

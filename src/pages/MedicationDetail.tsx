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
import { medicationBySlug, pathologyBySlug } from "@/services/content";
import { formatDate } from "@/lib/format";

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

export default function MedicationDetail() {
  const { slug } = useParams();
  const med = slug ? medicationBySlug(slug) : undefined;

  if (!med) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Médicament introuvable" message="Cette fiche n'existe pas ou a été déplacée." />
      </div>
    );
  }

  const relatedPathologies = med.relatedPathologies
    .map((s) => pathologyBySlug(s))
    .filter(Boolean);

  return (
    <div className="container-page py-6">
      <Breadcrumb
        items={[
          { label: "Accueil", to: "/" },
          { label: "Médicaments", to: "/recherche?type=medicament" },
          { label: `${med.name} ${med.dosage}` },
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
              {med.name} <span className="text-brand-green">{med.dosage}</span>
            </h1>
            <TrustBadge kind="medical" />
          </div>
          <p className="mt-1 text-sm text-text-secondary">Famille : {med.family}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {med.withoutPrescription && <Badge tone="green">Disponible sans ordonnance</Badge>}
            {med.forms.map((form) => (
              <Badge key={form} tone="neutral">
                {form}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main */}
        <div className="space-y-5">
          <MedicalDisclaimer />

          <SectionCard title="À quoi sert ce médicament ?" icon={<Info className="h-5 w-5" />}>
            <p className="text-sm leading-relaxed text-text-secondary">{med.usage}</p>
          </SectionCard>

          <SectionCard title="Posologie" icon={<Target className="h-5 w-5" />}>
            <p className="text-sm leading-relaxed text-text-secondary">{med.posology}</p>
          </SectionCard>

          <SectionCard title="Contre-indications" icon={<Ban className="h-5 w-5" />}>
            <BulletList items={med.contraindications} />
          </SectionCard>

          <SectionCard title="Effets secondaires" icon={<AlertTriangle className="h-5 w-5" />}>
            <BulletList items={med.sideEffects} />
          </SectionCard>

          <SectionCard title="Précautions d'emploi" icon={<ShieldAlert className="h-5 w-5" />}>
            <BulletList items={med.precautions} />
          </SectionCard>

          <SectionCard title="Interactions médicamenteuses" icon={<HeartPulse className="h-5 w-5" />}>
            <BulletList items={med.interactions} />
          </SectionCard>

          <SectionCard title="Le conseil du professionnel de santé" icon={<Stethoscope className="h-5 w-5" />}>
            <div className="rounded-2xl bg-brand-mint p-4 text-sm leading-relaxed text-text-primary">
              {med.professionalAdvice}
            </div>
          </SectionCard>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:h-fit">
          <div className="card-surface p-5">
            <h2 className="text-sm font-bold text-text-primary">Résumé</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <SummaryRow label="Famille" value={med.family} />
              <SummaryRow label="Formes" value={med.forms.join(", ")} />
              <SummaryRow label="Ordonnance" value={med.withoutPrescription ? "Non requise" : "Requise"} />
              {med.trust.updatedAt && (
                <SummaryRow label="Mise à jour" value={formatDate(med.trust.updatedAt)} />
              )}
              {med.trust.source && <SummaryRow label="Source" value={med.trust.source} />}
            </dl>
            <div className="mt-4 space-y-2">
              <ButtonLink to="/recherche?type=etablissement" fullWidth>
                <MapPin className="h-4 w-4" /> Trouver en pharmacie
              </ButtonLink>
              <Button variant="outline" fullWidth>
                <MessageCircleQuestion className="h-4 w-4" /> Poser une question
              </Button>
            </div>
          </div>

          <SidebarPanel title="Pathologies liées">
            {relatedPathologies.length > 0 ? (
              <div className="space-y-2">
                {relatedPathologies.map(
                  (p) => p && <PathologyCard key={p.slug} pathology={p} />,
                )}
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

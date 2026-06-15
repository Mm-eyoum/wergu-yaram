import { useParams } from "react-router-dom";
import {
  Activity,
  BookOpen,
  HelpCircle,
  Hospital,
  Leaf,
  Pill,
  Search,
  Stethoscope,
  Syringe,
  TriangleAlert,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SectionCard } from "@/components/ui/Card";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { TrustBadge } from "@/components/health/TrustBadge";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { MedicationCard } from "@/components/cards/MedicationCard";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { FacilityCard } from "@/components/cards/FacilityCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  articleBySlug,
  communityBySlug,
  facilityBySlug,
  medicationBySlug,
  pathologyBySlug,
} from "@/services/content";
import { formatDate } from "@/lib/format";

function BulletList({ items, danger }: { items: string[]; danger?: boolean }) {
  return (
    <ul className="space-y-2 text-sm text-text-secondary">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${danger ? "bg-danger" : "bg-brand-green"}`}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PathologyDetail() {
  const { slug } = useParams();
  const patho = slug ? pathologyBySlug(slug) : undefined;

  if (!patho) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Pathologie introuvable" message="Cette fiche n'existe pas ou a été déplacée." />
      </div>
    );
  }

  const meds = patho.commonMedications.map((s) => medicationBySlug(s)).filter(Boolean);
  const relatedArticles = patho.relatedArticles.map((s) => articleBySlug(s)).filter(Boolean);
  const nearby = patho.nearbyFacilities.map((s) => facilityBySlug(s)).filter(Boolean);
  const community = patho.communitySlug ? communityBySlug(patho.communitySlug) : undefined;

  return (
    <div className="container-page py-6">
      <Breadcrumb
        items={[
          { label: "Accueil", to: "/" },
          { label: "Pathologies", to: "/recherche?type=pathologie" },
          { label: patho.name },
        ]}
      />

      <header className="mt-4 flex flex-wrap items-start gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
          <Activity className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold sm:text-3xl">{patho.name}</h1>
            <TrustBadge kind="verified" />
          </div>
          <p className="mt-1 text-sm text-text-secondary">{patho.category}</p>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">{patho.summary}</p>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <MedicalDisclaimer />

          <SectionCard title="Comprendre la pathologie" icon={<BookOpen className="h-5 w-5" />}>
            <p className="text-sm leading-relaxed text-text-secondary">{patho.understanding}</p>
          </SectionCard>

          <SectionCard title="Symptômes fréquents" icon={<Stethoscope className="h-5 w-5" />}>
            <BulletList items={patho.symptoms} />
          </SectionCard>

          <SectionCard title="Causes et facteurs de risque" icon={<Search className="h-5 w-5" />}>
            <BulletList items={patho.causes} />
          </SectionCard>

          <SectionCard title="Prévention" icon={<Leaf className="h-5 w-5" />}>
            <BulletList items={patho.prevention} />
          </SectionCard>

          <SectionCard title="Traitements" icon={<Syringe className="h-5 w-5" />}>
            <BulletList items={patho.treatments} />
          </SectionCard>

          <SectionCard title="Quand consulter ?" icon={<TriangleAlert className="h-5 w-5" />}>
            <BulletList items={patho.whenToConsult} danger />
          </SectionCard>

          {patho.faq.length > 0 && (
            <SectionCard title="Questions fréquentes" icon={<HelpCircle className="h-5 w-5" />}>
              <div className="space-y-3">
                {patho.faq.map((item) => (
                  <details key={item.question} className="group rounded-2xl border border-border-soft p-4">
                    <summary className="cursor-pointer list-none font-semibold text-text-primary marker:hidden">
                      {item.question}
                    </summary>
                    <p className="mt-2 text-sm text-text-secondary">{item.answer}</p>
                  </details>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        <aside className="space-y-5">
          <SidebarPanel title="Médicaments courants" icon={<Pill className="h-4 w-4" />}>
            <div className="space-y-2">
              {meds.length ? (
                meds.map((m) => m && <MedicationCard key={m.slug} medication={m} />)
              ) : (
                <p className="text-sm text-text-secondary">Aucun médicament référencé.</p>
              )}
            </div>
          </SidebarPanel>

          {relatedArticles.length > 0 && (
            <SidebarPanel title="Articles & vidéos" icon={<BookOpen className="h-4 w-4" />}>
              <div className="space-y-3">
                {relatedArticles.map((a) => a && <ArticleCard key={a.slug} article={a} />)}
              </div>
            </SidebarPanel>
          )}

          {nearby.length > 0 && (
            <SidebarPanel title="Structures à proximité" icon={<Hospital className="h-4 w-4" />}>
              <div className="space-y-3">
                {nearby.map((f) => f && <FacilityCard key={f.slug} facility={f} />)}
              </div>
            </SidebarPanel>
          )}

          {community && (
            <SidebarPanel title="Communauté liée">
              <CommunityCard community={community} />
            </SidebarPanel>
          )}

          {patho.trust.updatedAt && (
            <p className="px-1 text-xs text-text-secondary">
              Contenu vérifié · mis à jour le {formatDate(patho.trust.updatedAt)}
              {patho.trust.source ? ` · ${patho.trust.source}` : ""}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

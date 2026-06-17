import { useParams } from "react-router-dom";
import { Globe, HandHeart, MapPin } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { PartnerCard } from "@/components/cards/PartnerCard";
import { ShareButtons } from "@/components/ShareButtons";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { usePartner, usePartners } from "@/hooks/useCatalog";
import { useComingSoon } from "@/hooks/useToast";
import { initials } from "@/lib/format";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

export default function PartnerDetail() {
  const { slug } = useParams();
  const { data: partner, isLoading } = usePartner(slug);
  const { data: partners = [] } = usePartners();
  const comingSoon = useComingSoon();

  if (isLoading) {
    return (
      <div className="container-page py-16">
        <LoadingState label="Chargement du partenaire…" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Partenaire introuvable" noIndex />
        <EmptyState title="Partenaire introuvable" message="Ce partenaire n'existe pas ou a été retiré." />
      </div>
    );
  }

  const related = partners.filter((p) => p.slug !== partner.slug && p.category === partner.category).slice(0, 3);

  return (
    <div className="container-page py-6">
      <SEOHead
        title={partner.name}
        description={partner.description}
        ogType="website"
        jsonLd={[
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Partenaires", path: "/partenaires" },
            { name: partner.name, path: `/partenaires/${partner.slug}` },
          ]),
        ]}
      />
      <Breadcrumb
        items={[
          { label: "Accueil", to: "/" },
          { label: "Partenaires", to: "/partenaires" },
          { label: partner.name },
        ]}
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="card-surface p-6">
            <div className="flex flex-wrap items-start gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-brand-mint p-3">
                {partner.logo ? (
                  <img src={partner.logo} alt={partner.name} className="max-h-14 object-contain" />
                ) : (
                  <span className="text-xl font-bold text-brand-green">{initials(partner.name)}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <Badge tone="mint">{partner.categoryLabel}</Badge>
                <h1 className="mt-2 text-2xl font-extrabold">{partner.name}</h1>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4" /> {partner.zone}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">{partner.description}</p>
            {partner.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {partner.tags.map((t) => (
                  <Badge key={t} tone="neutral">{t}</Badge>
                ))}
              </div>
            )}
            <ShareButtons
              className="mt-4"
              url={`/partenaires/${partner.slug}`}
              title={partner.name}
              description={partner.description}
              hashtags={["WerguYaram", "Partenaire"]}
            />
          </div>

          {related.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-bold">Autres partenaires similaires</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((p) => (
                  <PartnerCard key={p.slug} partner={p} href={`/partenaires/${p.slug}`} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <SidebarPanel title="Contribution" icon={<HandHeart className="h-4 w-4" />}>
            <p className="text-sm text-text-secondary">{partner.contributionsLabel}</p>
          </SidebarPanel>

          <div className="rounded-3xl bg-brand-gradient p-5 text-white">
            <Globe className="h-7 w-7" />
            <h3 className="mt-2 font-bold">Travailler avec ce partenaire ?</h3>
            <p className="mt-1 text-sm text-white/85">
              Contactez l'équipe Wergu Yaram pour une mise en relation.
            </p>
            <Button
              size="sm"
              className="mt-3 bg-white text-brand-green hover:bg-white"
              onClick={() => comingSoon("La mise en relation avec les partenaires arrive bientôt.")}
            >
              Demander un contact
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

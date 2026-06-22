import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Globe } from "lucide-react";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { EventCard } from "@/components/cards/EventCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTenantBySlug } from "@/services/catalog";
import { useArticles, useCommunities, useEvents } from "@/hooks/useCatalog";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

/**
 * Espace partenaire brandé (multi-tenant). Servi sur `<slug>.werguyaram.org` ou
 * `/espace/<slug>`. Agrège le contenu curé du partenaire à sa marque, sur
 * l'infrastructure Wergu Yaram. Accent visuel via `var(--tenant-accent)`.
 */
export default function TenantSpace() {
  const { slug } = useParams();
  const tenantQuery = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => getTenantBySlug(slug),
    enabled: !!slug,
  });
  const { data: communities = [] } = useCommunities();
  const { data: events = [] } = useEvents();
  const { data: articles = [] } = useArticles();

  const tenant = tenantQuery.data;
  const spaceCommunities = useMemo(
    () => communities.filter((c) => tenant?.communitySlugs?.includes(c.slug)),
    [communities, tenant],
  );
  const spaceEvents = useMemo(
    () => events.filter((e) => tenant?.eventIds?.includes(e.id)),
    [events, tenant],
  );
  const spaceArticles = useMemo(
    () => articles.filter((a) => tenant?.articleSlugs?.includes(a.slug)),
    [articles, tenant],
  );

  if (tenantQuery.isLoading) {
    return <div className="container-page py-16"><LoadingState label="Chargement de l'espace…" /></div>;
  }
  if (!tenant) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Espace introuvable" noIndex />
        <EmptyState title="Espace introuvable" message="Cet espace partenaire n'existe pas ou n'est plus actif." />
      </div>
    );
  }

  const accent = { color: "var(--tenant-accent, #007A5E)" };
  const accentBg = { backgroundColor: "var(--tenant-accent, #007A5E)" };

  return (
    <div>
      <SEOHead
        title={`${tenant.name} — Espace partenaire`}
        description={tenant.description}
        canonicalPath={`/espace/${tenant.slug}`}
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: tenant.name, path: `/espace/${tenant.slug}` },
        ])}
      />

      {/* Hero brandé */}
      <section className="border-b border-border-soft bg-brand-soft">
        <div className="container-page flex flex-col items-start gap-4 py-12 sm:flex-row sm:items-center">
          <span
            className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl text-2xl font-extrabold text-white"
            style={accentBg}
          >
            {tenant.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="h-full w-full object-cover" />
            ) : (
              tenant.name.slice(0, 2).toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Espace partenaire</p>
            <h1 className="text-2xl font-extrabold sm:text-3xl" style={accent}>{tenant.name}</h1>
            {tenant.description && <p className="mt-1 max-w-2xl text-text-secondary">{tenant.description}</p>}
          </div>
          {tenant.website && (
            <a
              href={tenant.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={accentBg}
            >
              <Globe className="h-4 w-4" /> Site officiel
            </a>
          )}
        </div>
      </section>

      <div className="container-page space-y-12 py-12">
        {spaceCommunities.length === 0 && spaceEvents.length === 0 && spaceArticles.length === 0 ? (
          <EmptyState
            title="Espace en préparation"
            message="Le contenu de cet espace partenaire sera bientôt disponible."
          />
        ) : (
          <>
            {spaceCommunities.length > 0 && (
              <Section title="Communautés">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {spaceCommunities.map((c) => <CommunityCard key={c.slug} community={c} />)}
                </div>
              </Section>
            )}
            {spaceEvents.length > 0 && (
              <Section title="Événements">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {spaceEvents.map((e) => <EventCard key={e.id} event={e} />)}
                </div>
              </Section>
            )}
            {spaceArticles.length > 0 && (
              <Section title="Ressources & articles">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {spaceArticles.map((a) => <ArticleCard key={a.slug} article={a} />)}
                </div>
              </Section>
            )}
          </>
        )}

        <p className="flex items-center justify-center gap-1.5 border-t border-border-soft pt-6 text-sm text-text-secondary">
          Propulsé par
          <Link to="/" className="inline-flex items-center gap-1 font-semibold text-brand-green hover:underline">
            Wergu Yaram <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

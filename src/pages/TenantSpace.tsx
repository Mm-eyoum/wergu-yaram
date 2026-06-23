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
import {
  useArticles,
  useCommunities,
  useEvents,
  useCommittees,
  useTenantCommunities,
  useTenantEvents,
  useTenantArticles,
} from "@/hooks/useCatalog";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";
import { useAuth } from "@/hooks/useAuth";
import { Settings } from "lucide-react";

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
  const { data: committees = [] } = useCommittees();
  // Ownership model: content tagged with tenantSlug. We UNION it with the legacy
  // curated lists so both migrated and admin-curated content show (transition).
  const { data: ownedCommunities = [] } = useTenantCommunities(slug);
  const { data: ownedEvents = [] } = useTenantEvents(slug);
  const { data: ownedArticles = [] } = useTenantArticles(slug);

  const { user } = useAuth();
  const tenant = tenantQuery.data;
  const isManager =
    !!user && !!tenant && (tenant.ownerUid === user.uid || !!tenant.managerUids?.includes(user.uid));
  const committee = useMemo(
    () => committees.find((c) => c.tenantSlug === tenant?.slug),
    [committees, tenant],
  );
  const spaceCommunities = useMemo(
    () => dedupeBy(
      [...ownedCommunities, ...communities.filter((c) => tenant?.communitySlugs?.includes(c.slug))],
      (c) => c.slug,
    ),
    [ownedCommunities, communities, tenant],
  );
  const spaceEvents = useMemo(
    () => dedupeBy(
      [...ownedEvents, ...events.filter((e) => tenant?.eventIds?.includes(e.id))],
      (e) => e.id,
    ),
    [ownedEvents, events, tenant],
  );
  const spaceArticles = useMemo(
    () => dedupeBy(
      [...ownedArticles, ...articles.filter((a) => tenant?.articleSlugs?.includes(a.slug))],
      (a) => a.slug,
    ),
    [ownedArticles, articles, tenant],
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
          {isManager && (
            <Link
              to={`/espace/${tenant.slug}/gestion`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-current px-4 py-2.5 text-sm font-semibold"
              style={accent}
            >
              <Settings className="h-4 w-4" /> Gérer mon espace
            </Link>
          )}
        </div>
      </section>

      <div className="container-page space-y-12 py-12">
        {/* Impact mesurable */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-text-primary">Impact &amp; gouvernance</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ImpactTile label="Communautés" value={spaceCommunities.length} />
            <ImpactTile label="Membres" value={spaceCommunities.reduce((n, c) => n + (c.membersCount || 0), 0)} />
            <ImpactTile label="Événements" value={spaceEvents.length} />
            <ImpactTile label="Ressources" value={spaceArticles.length} />
            {committee?.indicators.map((i) => (
              <ImpactTile key={i.label} label={i.label} value={i.value} />
            ))}
          </div>

          {committee && (
            <div className="card-surface mt-4 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Comité de pilotage</p>
              <h3 className="mt-1 font-bold text-text-primary">{committee.name}</h3>
              {committee.mission && <p className="mt-1 text-sm text-text-secondary">{committee.mission}</p>}
              {committee.members.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {committee.members.map((m) => (
                    <span key={m.name} className="rounded-full bg-brand-soft px-3 py-1 text-xs text-text-secondary">
                      <b className="text-text-primary">{m.name}</b>
                      {m.role ? ` · ${m.role}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

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

/** Merge lists keeping first occurrence per key (owned content wins over curated). */
function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const k = key(it);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function ImpactTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-white p-4 text-center">
      <p className="text-xl font-extrabold" style={{ color: "var(--tenant-accent, #007A5E)" }}>{value}</p>
      <p className="mt-0.5 text-xs text-text-secondary">{label}</p>
    </div>
  );
}

import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Calendar,
  Globe,
  HandHeart,
  MapPin,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { EventCard } from "@/components/cards/EventCard";
import { PartnerCard } from "@/components/cards/PartnerCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CountUpStat } from "@/components/ui/CountUpStat";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ShareButtons } from "@/components/ShareButtons";
import { getTenantBySlug } from "@/services/catalog";
import {
  usePartner,
  usePartners,
  useArticles,
  useCommunities,
  useEvents,
  useCommittees,
  useTenantCommunities,
  useTenantEvents,
  useTenantArticles,
} from "@/hooks/useCatalog";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useComingSoon } from "@/hooks/useToast";
import { initials } from "@/lib/format";
import { logTenantPageview } from "@/lib/tenantPageview";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

/**
 * Profil partenaire unifié (route unique `/partenaires/:slug`). Résout le slug
 * contre les deux collections : un `tenant` (espace partenaire brandé, riche)
 * est prioritaire ; à défaut un `partner` du catalogue éditorial (fiche simple).
 * Même design « landing » pour les deux, la richesse s'adapte aux données.
 */
export default function PartnerProfile() {
  // On the canonical route `/partenaires/:slug` the slug comes from the URL; when
  // rendered at `/` on a partner sub-domain (<slug>.werguyaram.org) there's no
  // param, so fall back to the tenant resolved from the host.
  const { slug: slugParam } = useParams();
  const { slug: hostSlug } = useTenant();
  // On the sub-domain, fall back to the host-resolved slug — even when no tenant
  // doc matched it — so the catalogue-partner lookup and the noindex 404 below
  // can still run for that slug.
  const slug = slugParam ?? hostSlug ?? undefined;
  const comingSoon = useComingSoon();
  const { user } = useAuth();

  const tenantQuery = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => getTenantBySlug(slug),
    enabled: !!slug,
  });
  const partnerQuery = usePartner(slug);
  const tenant = tenantQuery.data;
  const partner = partnerQuery.data;
  const isTenant = !!tenant;

  // Catalogue : partenaires similaires (même catégorie).
  const { data: partners = [] } = usePartners();
  // Tenant : contenu agrégé (owned via tenantSlug ∪ listes curées).
  const { data: communities = [] } = useCommunities();
  const { data: events = [] } = useEvents();
  const { data: articles = [] } = useArticles();
  const { data: committees = [] } = useCommittees();
  const { data: ownedCommunities = [] } = useTenantCommunities(isTenant ? slug : undefined);
  const { data: ownedEvents = [] } = useTenantEvents(isTenant ? slug : undefined);
  const { data: ownedArticles = [] } = useTenantArticles(isTenant ? slug : undefined);

  useEffect(() => {
    // Log the real URL: `/` on the sub-domain, `/partenaires/<slug>` on the
    // main domain — not a fixed path, so analytics reflect actual traffic.
    if (tenant?.slug) logTenantPageview(tenant.slug, window.location.pathname);
  }, [tenant?.slug]);

  const isManager =
    !!user && !!tenant && (tenant.ownerUid === user.uid || !!tenant.managerUids?.includes(user.uid));
  const committee = useMemo(
    () => committees.find((c) => c.tenantSlug === tenant?.slug),
    [committees, tenant],
  );
  const spaceCommunities = useMemo(
    () => dedupeBy([...ownedCommunities, ...communities.filter((c) => tenant?.communitySlugs?.includes(c.slug))], (c) => c.slug),
    [ownedCommunities, communities, tenant],
  );
  const spaceEvents = useMemo(
    () => dedupeBy([...ownedEvents, ...events.filter((e) => tenant?.eventIds?.includes(e.id))], (e) => e.id),
    [ownedEvents, events, tenant],
  );
  const spaceArticles = useMemo(
    () => dedupeBy([...ownedArticles, ...articles.filter((a) => tenant?.articleSlugs?.includes(a.slug))], (a) => a.slug),
    [ownedArticles, articles, tenant],
  );
  const related = useMemo(
    () => (partner ? partners.filter((p) => p.slug !== partner.slug && p.category === partner.category).slice(0, 3) : []),
    [partners, partner],
  );

  if (tenantQuery.isLoading || partnerQuery.isLoading) {
    return (
      <div className="container-page py-16">
        <LoadingState label="Chargement du partenaire…" />
      </div>
    );
  }
  if (!tenant && !partner) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Partenaire introuvable" noIndex />
        <EmptyState title="Partenaire introuvable" message="Ce partenaire n'existe pas ou n'est plus actif." />
      </div>
    );
  }

  // Champs résolus depuis la source disponible (tenant prioritaire).
  const name = tenant?.name || partner?.name || "";
  const logo = tenant?.logo || partner?.logo || "";
  const description = tenant?.description || partner?.description || "";
  const zone = partner?.zone || "";
  const categoryLabel = isTenant ? "Espace partenaire" : partner?.categoryLabel || "Partenaire";
  const website = tenant?.website;
  const accent = tenant?.theme?.accent || "#007A5E";
  const banner = tenant?.theme?.banner;

  const heroStyle: React.CSSProperties = banner
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(11,31,73,0.80), rgba(11,31,73,0.55)), url(${banner})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundImage: `linear-gradient(135deg, ${accent} 0%, #00A878 55%, #0B1F49 145%)` };

  const memberTotal = spaceCommunities.reduce((n, c) => n + (c.membersCount || 0), 0);
  const hasContent = spaceCommunities.length > 0 || spaceEvents.length > 0 || spaceArticles.length > 0;

  return (
    <div>
      <SEOHead
        title={isTenant ? `${name} — Espace partenaire` : name}
        description={description}
        ogType="website"
        canonicalPath={`/partenaires/${slug}`}
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Partenaires", path: "/partenaires" },
          { name, path: `/partenaires/${slug}` },
        ])}
      />

      {/* ── Héros landing ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white" style={heroStyle}>
        {/* Blobs décoratifs (mouvement désactivé si reduced-motion) */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl motion-safe:animate-float"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl motion-safe:animate-float"
          style={{ animationDelay: "1.8s" }}
        />

        <div className="container-page relative z-10 py-12 sm:py-16">
          <Link
            to="/partenaires"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Partenaires
          </Link>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/95 p-3 shadow-card backdrop-blur">
              {logo ? (
                <img src={logo} alt={name} className="max-h-16 max-w-[80px] object-contain" />
              ) : (
                <span className="text-2xl font-extrabold text-brand-green">{initials(name)}</span>
              )}
            </span>

            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                {isTenant ? <Sparkles className="h-3.5 w-3.5" /> : null}
                {categoryLabel}
              </span>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{name}</h1>
              {zone && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/85">
                  <MapPin className="h-4 w-4" /> {zone}
                </p>
              )}
              {description && <p className="mt-3 max-w-2xl text-white/85">{description}</p>}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-green shadow-soft transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <Globe className="h-4 w-4" /> Site officiel
                  </a>
                )}
                {isManager && tenant && (
                  <Link
                    to={`/espace/${tenant.slug}/gestion`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <Settings className="h-4 w-4" /> Gérer mon espace
                  </Link>
                )}
                <ShareButtons
                  className="[&_a]:text-white [&_button]:text-white"
                  url={`/partenaires/${slug}`}
                  title={name}
                  description={description}
                  hashtags={["WerguYaram", "Partenaire"]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page space-y-12 py-12">
        {/* ── Stats d'impact animées (tenant) ──────────────────────── */}
        {isTenant && (
          <section className="animate-fade-in">
            <h2 className="mb-4 text-lg font-bold text-text-primary">Impact &amp; gouvernance</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CountUpStat label="Communautés" value={spaceCommunities.length} icon={<Users className="h-5 w-5" />} accent={accent} />
              <CountUpStat label="Membres" value={memberTotal} icon={<HandHeart className="h-5 w-5" />} accent={accent} />
              <CountUpStat label="Événements" value={spaceEvents.length} icon={<Calendar className="h-5 w-5" />} accent={accent} />
              <CountUpStat label="Ressources" value={spaceArticles.length} icon={<BookOpen className="h-5 w-5" />} accent={accent} />
              {committee?.indicators.map((i) => (
                <CountUpStat key={i.label} label={i.label} value={i.value} accent={accent} />
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
        )}

        {/* ── Contribution (catalogue) ─────────────────────────────── */}
        {!isTenant && partner && (partner.contributionsLabel || partner.tags.length > 0) && (
          <section className="animate-fade-in card-surface p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-mint text-brand-green">
                <HandHeart className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-text-primary">Notre contribution</h2>
            </div>
            {partner.contributionsLabel && (
              <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">{partner.contributionsLabel}</p>
            )}
            {partner.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {partner.tags.map((tag) => (
                  <Badge key={tag} tone="mint">{tag}</Badge>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Contenu riche (tenant) ───────────────────────────────── */}
        {isTenant &&
          (hasContent ? (
            <>
              {spaceCommunities.length > 0 && (
                <ContentSection title="Communautés" icon={<Users className="h-5 w-5" />} count={spaceCommunities.length}>
                  {spaceCommunities.map((c) => <CommunityCard key={c.slug} community={c} />)}
                </ContentSection>
              )}
              {spaceEvents.length > 0 && (
                <ContentSection title="Événements" icon={<Calendar className="h-5 w-5" />} count={spaceEvents.length}>
                  {spaceEvents.map((e) => <EventCard key={e.id} event={e} />)}
                </ContentSection>
              )}
              {spaceArticles.length > 0 && (
                <ContentSection title="Ressources &amp; articles" icon={<BookOpen className="h-5 w-5" />} count={spaceArticles.length}>
                  {spaceArticles.map((a) => <ArticleCard key={a.slug} article={a} />)}
                </ContentSection>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <EmptyState title="Espace en préparation" message="Le contenu de cet espace partenaire sera bientôt disponible." />
              {isManager && (
                <Link
                  to={`/espace/${slug}/gestion/contenus`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-green/90"
                >
                  <Settings className="h-4 w-4" /> Ajouter du contenu
                </Link>
              )}
            </div>
          ))}

        {/* ── Partenaires similaires (catalogue) ───────────────────── */}
        {!isTenant && related.length > 0 && (
          <section className="animate-fade-in">
            <h2 className="mb-4 text-lg font-bold text-text-primary">Partenaires similaires</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PartnerCard key={p.slug} partner={p} href={`/partenaires/${p.slug}`} />
              ))}
            </div>
          </section>
        )}

        {/* ── CTA collaboration ────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-brand-navy p-8 text-center text-white sm:p-12">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-teal/20 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <HandHeart className="h-10 w-10 text-brand-teal" />
            <h2 className="text-2xl font-bold">Collaborer avec {name}</h2>
            <p className="max-w-xl text-sm text-white/80">
              Rejoignez l'écosystème Wergu Yaram et construisons ensemble des actions de santé à impact.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="mt-2 bg-white text-brand-green hover:bg-white"
              onClick={() => comingSoon("Le formulaire de collaboration arrive bientôt. Écrivez-nous en attendant.")}
            >
              Proposer une collaboration <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {isTenant && (
          <p className="flex items-center justify-center gap-1.5 border-t border-border-soft pt-6 text-sm text-text-secondary">
            Propulsé par
            <Link to="/" className="inline-flex items-center gap-1 font-semibold text-brand-green hover:underline">
              Wergu Yaram <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function ContentSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-mint text-brand-green">{icon}</span>
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        <Badge tone="neutral">{count}</Badge>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
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

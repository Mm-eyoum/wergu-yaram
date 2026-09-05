import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Calendar,
  Globe,
  HandHeart,
  MapPin,
  Quote,
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
import { PartnerLeadForm } from "@/components/tenant/PartnerLeadForm";
import { PartnerJoinForm } from "@/components/tenant/PartnerJoinForm";
import {
  SectionHeading,
  GovernancePanel,
  SupportBand,
  TenantCtaLink,
} from "@/components/tenant/TenantUI";
import { getTenantBySlug } from "@/services/catalog";
import { usePartner, usePartners } from "@/hooks/useCatalog";
import { useTenantSpace } from "@/hooks/useTenantSpace";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useComingSoon } from "@/hooks/useToast";
import { initials } from "@/lib/format";
import { accentTheme } from "@/lib/tenantTheme";
import { resolveTenantCta } from "@/lib/tenantCta";
import { logTenantPageview } from "@/lib/tenantPageview";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

/**
 * Profil partenaire unifié (route `/partenaires/:slug`, ou `/` sur un
 * sous-domaine). Un `tenant` (espace partenaire) rend une **landing white-label
 * narrative** ; à défaut un `partner` éditorial rend une fiche catalogue.
 */
export default function PartnerProfile() {
  const { slug: slugParam } = useParams();
  const { slug: hostSlug } = useTenant();
  const slug = slugParam ?? hostSlug ?? undefined;
  const onSubdomain = !slugParam && !!hostSlug;
  const comingSoon = useComingSoon();
  const { user } = useAuth();

  const tenantQuery = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => getTenantBySlug(slug),
    enabled: !!slug,
  });
  const partnerQuery = usePartner(slug);
  const tenant = tenantQuery.data;
  const partner = onSubdomain ? undefined : partnerQuery.data;
  const isTenant = !!tenant;

  const { data: partners = [] } = usePartners();
  const {
    communities: spaceCommunities,
    events: spaceEvents,
    articles: spaceArticles,
    needs: ownedNeeds,
    testimonials: spaceTestimonials,
    offers: spaceOffers,
  } = useTenantSpace(slug, tenant);

  useEffect(() => {
    if (tenant?.slug) logTenantPageview(tenant.slug, window.location.pathname);
  }, [tenant?.slug]);

  const isManager =
    !!user && !!tenant && (tenant.ownerUid === user.uid || !!tenant.managerUids?.includes(user.uid));
  const committee = tenant?.committee;
  const related = useMemo(
    () => (partner ? partners.filter((p) => p.slug !== partner.slug && p.category === partner.category).slice(0, 3) : []),
    [partners, partner],
  );

  if (tenantQuery.isLoading || (!onSubdomain && partnerQuery.isLoading)) {
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

  const name = tenant?.name || partner?.name || "";
  const logo = tenant?.logo || partner?.logo || "";
  const description = tenant?.description || partner?.description || "";
  const zone = partner?.zone || "";
  const website = tenant?.website;
  const accent = tenant?.theme?.accent;
  const banner = tenant?.theme?.banner;
  const theme = accentTheme(accent);

  const seo = (
    <SEOHead
      title={isTenant ? `${name} — Espace partenaire` : name}
      description={description}
      ogType="website"
      ogImage={banner || logo || undefined}
      canonicalPath={`/partenaires/${slug}`}
      jsonLd={breadcrumbJsonLd([
        { name: "Accueil", path: "/" },
        { name: "Partenaires", path: "/partenaires" },
        { name, path: `/partenaires/${slug}` },
      ])}
    />
  );

  // ════════════════════════════════════════════════════════════════════
  // TENANT — landing white-label narrative
  // ════════════════════════════════════════════════════════════════════
  if (isTenant && tenant) {
    const cta = resolveTenantCta({ needs: ownedNeeds, communities: spaceCommunities, tenant });
    const memberTotal = spaceCommunities.reduce((n, c) => n + (c.membersCount || 0), 0);
    const topIndicator = committee?.indicators[0];
    const heroStyle: React.CSSProperties = banner
      ? {
          backgroundImage: `linear-gradient(135deg, rgba(11,31,73,0.82), rgba(11,31,73,0.55)), url(${banner})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : { backgroundImage: `linear-gradient(135deg, ${theme.solid} 0%, #0B1F49 135%)` };

    const contentCounts = [
      { label: "Communautés", value: spaceCommunities.length, icon: <Users className="h-5 w-5" /> },
      { label: "Membres", value: memberTotal, icon: <HandHeart className="h-5 w-5" /> },
      { label: "Événements", value: spaceEvents.length, icon: <Calendar className="h-5 w-5" /> },
      { label: "Ressources", value: spaceArticles.length, icon: <BookOpen className="h-5 w-5" /> },
    ];

    return (
      <div>
        {seo}

        {/* ── Héros ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden text-white" style={heroStyle}>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl motion-safe:animate-float" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl motion-safe:animate-float" style={{ animationDelay: "1.8s" }} />

          <div className="container-page relative z-10 py-14 sm:py-20">
            {!onSubdomain && (
              <Link to="/partenaires" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white">
                <ArrowLeft className="h-4 w-4" /> Partenaires
              </Link>
            )}

            <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
              <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/95 p-3 shadow-card backdrop-blur">
                {logo ? (
                  <img src={logo} alt={name} className="max-h-16 max-w-[80px] object-contain" />
                ) : (
                  <span className="text-2xl font-extrabold" style={theme.text}>{initials(name)}</span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                    <Sparkles className="h-3.5 w-3.5" /> Espace partenaire
                  </span>
                  {tenant.verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                      <BadgeCheck className="h-3.5 w-3.5" /> Vérifié
                    </span>
                  )}
                </span>
                <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">{name}</h1>
                {description && <p className="mt-3 max-w-2xl text-white/85">{description}</p>}

                {topIndicator && (
                  <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm backdrop-blur">
                    <span className="font-extrabold">{topIndicator.value}</span>
                    <span className="text-white/85">{topIndicator.label}</span>
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <TenantCtaLink
                    cta={cta}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold shadow-soft transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    style={theme.text}
                  />
                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                      <Globe className="h-4 w-4" /> Site officiel
                    </a>
                  )}
                  {isManager && (
                    <Link to={`/espace/${tenant.slug}/gestion`} className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                      <Settings className="h-4 w-4" /> Gérer
                    </Link>
                  )}
                  <ShareButtons className="[&_a]:text-white [&_button]:text-white" url={`/partenaires/${slug}`} title={name} description={description} hashtags={["WerguYaram", "Partenaire"]} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container-page space-y-14 py-14">
          {/* ── Mission ─────────────────────────────────────────────── */}
          <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="card-surface p-6 sm:p-8">
              <SectionHeading icon={<HandHeart className="h-5 w-5" style={theme.text} />} title="Notre mission" accent={accent} action={{ label: "En savoir plus", to: "/a-propos" }} />
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-text-secondary">
                {description || "Ce partenaire présentera bientôt sa mission et ses actions sur cet espace."}
              </p>
            </div>
            <aside className="card-surface h-fit p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Repères</p>
              <dl className="mt-3 space-y-3">
                {website && <Repere icon={<Globe className="h-4 w-4" />} label="Site officiel" value={website} theme={theme} />}
                <Repere icon={<Users className="h-4 w-4" />} label="Communautés" value={`${spaceCommunities.length}`} theme={theme} />
                {memberTotal > 0 && <Repere icon={<MapPin className="h-4 w-4" />} label="Membres réunis" value={memberTotal.toLocaleString("fr-FR")} theme={theme} />}
              </dl>
            </aside>
          </section>

          {/* ── Impact & gouvernance ────────────────────────────────── */}
          {committee ? (
            <section className="animate-fade-in">
              <SectionHeading icon={<Sparkles className="h-5 w-5" style={theme.text} />} title="Impact & gouvernance" accent={accent} />
              <GovernancePanel committee={committee} accent={accent} />
            </section>
          ) : (
            <section className="animate-fade-in">
              <SectionHeading icon={<Sparkles className="h-5 w-5" style={theme.text} />} title="L'espace en chiffres" accent={accent} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {contentCounts.map((s) => (
                  <CountUpStat key={s.label} label={s.label} value={s.value} icon={s.icon} accent={theme.solid} />
                ))}
              </div>
            </section>
          )}

          {/* ── Aperçus de contenu ──────────────────────────────────── */}
          {spaceCommunities.length > 0 && (
            <section className="animate-fade-in">
              <SectionHeading icon={<Users className="h-5 w-5" style={theme.text} />} title="Communautés" count={spaceCommunities.length} accent={accent} action={{ label: "Voir tout", to: "/communautes" }} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {spaceCommunities.slice(0, 3).map((c) => <CommunityCard key={c.slug} community={c} />)}
              </div>
            </section>
          )}
          {spaceEvents.length > 0 && (
            <section className="animate-fade-in">
              <SectionHeading icon={<Calendar className="h-5 w-5" style={theme.text} />} title="Événements" count={spaceEvents.length} accent={accent} action={{ label: "Voir tout", to: "/evenements" }} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {spaceEvents.slice(0, 3).map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            </section>
          )}
          {spaceArticles.length > 0 && (
            <section className="animate-fade-in">
              <SectionHeading icon={<BookOpen className="h-5 w-5" style={theme.text} />} title="Ressources & articles" count={spaceArticles.length} accent={accent} action={{ label: "Voir tout", to: "/ressources" }} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {spaceArticles.slice(0, 3).map((a) => <ArticleCard key={a.slug} article={a} />)}
              </div>
            </section>
          )}

          {(["service", "produit", "appel"] as const).map((k) => {
            const items = spaceOffers.filter((o) => o.kind === k);
            if (items.length === 0) return null;
            const title = k === "service" ? "Nos services" : k === "produit" ? "Produits & solutions" : "Appels à projets";
            return (
              <section key={k} className="animate-fade-in">
                <SectionHeading icon={<Briefcase className="h-5 w-5" style={theme.text} />} title={title} count={items.length} accent={accent} />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((o) => (
                    <div key={o.slug} className="card-surface flex flex-col p-5">
                      {o.image && <img src={o.image} alt={o.title} className="mb-3 h-32 w-full rounded-xl object-cover" />}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {o.category && <Badge tone="mint">{o.category}</Badge>}
                        {o.meta && <span className="text-xs font-semibold" style={theme.text}>{o.meta}</span>}
                      </div>
                      <h3 className="mt-2 font-bold text-text-primary">{o.title}</h3>
                      <p className="mt-1 flex-1 line-clamp-3 text-sm text-text-secondary">{o.summary}</p>
                      {o.ctaUrl ? (
                        <a href={o.ctaUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:gap-1.5" style={theme.text}>
                          {o.ctaLabel || "En savoir plus"} <ArrowRight className="h-4 w-4" />
                        </a>
                      ) : (
                        <a href="#contact" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:gap-1.5" style={theme.text}>
                          {o.ctaLabel || "Nous contacter"} <ArrowRight className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {spaceTestimonials.length > 0 && (
            <section className="animate-fade-in">
              <SectionHeading icon={<Quote className="h-5 w-5" style={theme.text} />} title="Témoignages" count={spaceTestimonials.length} accent={accent} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {spaceTestimonials.map((tm) => (
                  <figure key={tm.slug} className="card-surface flex flex-col p-5">
                    <Quote className="h-6 w-6 opacity-40" style={theme.text} />
                    <blockquote className="mt-2 flex-1 text-sm text-text-secondary">« {tm.quote} »</blockquote>
                    <figcaption className="mt-4 flex items-center gap-3 border-t border-border-soft pt-3">
                      {tm.avatar ? (
                        <img src={tm.avatar} alt={tm.authorName} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-mint text-xs font-bold" style={theme.text}>{initials(tm.authorName)}</span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{tm.authorName}</p>
                        {(tm.authorRole || tm.org) && (
                          <p className="truncate text-xs text-text-secondary">{[tm.authorRole, tm.org].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {tenant.cotisationLabel && (
            <section className="animate-fade-in" id="adherer">
              <SectionHeading icon={<HandHeart className="h-5 w-5" style={theme.text} />} title={`Devenir membre de ${name}`} accent={accent} />
              <div className="max-w-2xl">
                <PartnerJoinForm tenantSlug={tenant.slug} cotisationLabel={tenant.cotisationLabel} accent={accent} />
              </div>
            </section>
          )}

          {/* ── Contact / lead capture ──────────────────────────────── */}
          <section className="animate-fade-in" id="contact">
            <SectionHeading icon={<HandHeart className="h-5 w-5" style={theme.text} />} title={`Contacter ${name}`} accent={accent} />
            <div className="max-w-2xl">
              <PartnerLeadForm tenantSlug={tenant.slug} accent={accent} />
            </div>
          </section>

          {/* ── Bande d'action ──────────────────────────────────────── */}
          <SupportBand cta={cta} name={name} accent={accent} />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // PARTENAIRE ÉDITORIAL — fiche catalogue (domaine principal)
  // ════════════════════════════════════════════════════════════════════
  const editorialHero: React.CSSProperties = { backgroundImage: `linear-gradient(135deg, #00A878 0%, #0B1F49 135%)` };
  return (
    <div>
      {seo}
      <section className="relative overflow-hidden text-white" style={editorialHero}>
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl motion-safe:animate-float" />
        <div className="container-page relative z-10 py-12 sm:py-16">
          <Link to="/partenaires" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Partenaires
          </Link>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/95 p-3 shadow-card backdrop-blur">
              {logo ? <img src={logo} alt={name} className="max-h-16 max-w-[80px] object-contain" /> : <span className="text-2xl font-extrabold text-brand-green">{initials(name)}</span>}
            </span>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                {partner?.categoryLabel || "Partenaire"}
              </span>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{name}</h1>
              {zone && <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/85"><MapPin className="h-4 w-4" /> {zone}</p>}
              {description && <p className="mt-3 max-w-2xl text-white/85">{description}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <ShareButtons className="[&_a]:text-white [&_button]:text-white" url={`/partenaires/${slug}`} title={name} description={description} hashtags={["WerguYaram", "Partenaire"]} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page space-y-12 py-12">
        {partner && (partner.contributionsLabel || partner.tags.length > 0) && (
          <section className="animate-fade-in card-surface p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-mint text-brand-green"><HandHeart className="h-5 w-5" /></span>
              <h2 className="text-lg font-bold text-text-primary">Notre contribution</h2>
            </div>
            {partner.contributionsLabel && <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">{partner.contributionsLabel}</p>}
            {partner.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">{partner.tags.map((tag) => <Badge key={tag} tone="mint">{tag}</Badge>)}</div>
            )}
          </section>
        )}

        {related.length > 0 && (
          <section className="animate-fade-in">
            <h2 className="mb-4 text-lg font-bold text-text-primary">Partenaires similaires</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => <PartnerCard key={p.slug} partner={p} href={`/partenaires/${p.slug}`} />)}
            </div>
          </section>
        )}

        <section className="relative overflow-hidden rounded-3xl bg-brand-navy p-8 text-center text-white sm:p-12">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-teal/20 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <HandHeart className="h-10 w-10 text-brand-teal" />
            <h2 className="text-2xl font-bold">Collaborer avec {name}</h2>
            <p className="max-w-xl text-sm text-white/80">Rejoignez l'écosystème Wergu Yaram et construisons ensemble des actions de santé à impact.</p>
            <Button variant="primary" size="lg" className="mt-2 bg-white text-brand-green hover:bg-white" onClick={() => comingSoon("Le formulaire de collaboration arrive bientôt. Écrivez-nous en attendant.")}>
              Proposer une collaboration <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Repere({ icon, label, value, theme }: { icon: React.ReactNode; label: string; value: string; theme: ReturnType<typeof accentTheme> }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={theme.chip}>{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-text-secondary">{label}</dt>
        <dd className="truncate text-sm font-semibold text-text-primary">{value}</dd>
      </div>
    </div>
  );
}

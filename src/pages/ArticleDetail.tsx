import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Clock, MapPin, MessageCircle, PlayCircle, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { ShareButtons } from "@/components/ShareButtons";
import { FavoriteButton } from "@/components/content/FavoriteButton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { TrustStatsBar, type Stat } from "@/components/ui/TrustStatsBar";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { MedicationCard } from "@/components/cards/MedicationCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useArticle, useArticles, useFacilities, useMedications } from "@/hooks/useCatalog";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { useSiteSettings } from "@/hooks/useSiteConfig";
import { formatCount } from "@/services/stats";
import { formatDate } from "@/lib/format";
import { SEOHead } from "@/seo/SEOHead";
import { articleJsonLd, breadcrumbJsonLd } from "@/seo/jsonld";

export default function ArticleDetail() {
  const { slug } = useParams();
  const { data: article, isLoading } = useArticle(slug);
  const { data: articles = [] } = useArticles();
  const { data: medications = [] } = useMedications();
  const { data: facilities = [] } = useFacilities();

  // Trust strip: real counts + admin-entered figures; empty cards are dropped.
  const platformStats = usePlatformStats().data;
  const editableStats = useSiteSettings().data?.stats;
  const trustStats: Stat[] = [
    platformStats?.members != null
      ? { value: formatCount(platformStats.members)!, label: "Utilisateurs", icon: <Users className="h-5 w-5" /> }
      : false,
    editableStats?.verifiedInfo
      ? { value: editableStats.verifiedInfo, label: "Contenus vérifiés", icon: <BadgeCheck className="h-5 w-5" /> }
      : false,
    platformStats?.facilities != null
      ? { value: formatCount(platformStats.facilities)!, label: "Établissements", icon: <MapPin className="h-5 w-5" /> }
      : false,
    { value: "100 %", label: "Sources fiables", icon: <ShieldCheck className="h-5 w-5" /> },
  ].filter(Boolean) as Stat[];

  if (isLoading) {
    return (
      <div className="container-page py-16">
        <LoadingState label="Chargement de l'article…" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Article introuvable" noIndex />
        <EmptyState title="Article introuvable" message="Ce contenu n'existe pas ou a été déplacé." />
      </div>
    );
  }

  const related = article.relatedArticles.map((s) => articles.find((a) => a.slug === s)).filter(Boolean);
  const meds = article.relatedMedications.map((s) => medications.find((m) => m.slug === s)).filter(Boolean);
  const specialists = facilities.slice(0, 2);

  return (
    <div className="container-page py-6">
      <SEOHead
        title={article.title}
        description={article.excerpt}
        ogType={article.type === "video" ? "video.other" : "article"}
        ogImage={article.cover}
        publishedTime={article.publishedAt}
        modifiedTime={article.trust.updatedAt}
        author={article.author.name}
        section={article.category}
        jsonLd={[
          articleJsonLd(article),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Articles", path: "/recherche?type=article" },
            { name: article.title, path: `/articles/${article.slug}` },
          ]),
        ]}
      />
      <Breadcrumb
        items={[
          { label: "Accueil", to: "/" },
          { label: "Articles", to: "/recherche?type=article" },
          { label: article.title },
        ]}
      />

      <div className="mt-4 grid gap-8 lg:grid-cols-[220px_1fr_300px]">
        {/* TOC */}
        <aside className="hidden lg:block">
          {article.toc.length > 0 && (
            <nav className="sticky top-20 card-surface p-4" aria-label="Sommaire">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">
                Sommaire
              </h2>
              <ul className="space-y-1.5">
                {article.toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block rounded-lg px-2 py-1 text-sm text-text-secondary hover:bg-brand-mint hover:text-brand-green"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>

        {/* Body */}
        <article className="min-w-0">
          <Badge tone="mint">{article.category}</Badge>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{article.title}</h1>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={article.author.name} size="md" />
              <div>
                <p className="text-sm font-bold text-text-primary">{article.author.name}</p>
                <p className="text-xs text-text-secondary">{article.author.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {article.type === "video" ? article.videoDurationLabel : `${article.readingMinutes} min`}
              </span>
              <span>{formatDate(article.publishedAt)}</span>
            </div>
          </div>

          <div className="relative mt-5 overflow-hidden rounded-3xl">
            <img src={article.cover} alt="" className="h-56 w-full object-cover sm:h-72" decoding="async" fetchPriority="high" />
            {article.type === "video" && (
              <span className="absolute inset-0 grid place-items-center bg-black/25">
                <PlayCircle className="h-16 w-16 text-white" />
              </span>
            )}
          </div>

          {article.sponsor?.name && (
            <a
              href={article.sponsor.url || undefined}
              target={article.sponsor.url ? "_blank" : undefined}
              rel="noreferrer sponsored"
              className="mt-4 flex items-center gap-3 rounded-2xl border border-border-soft bg-brand-soft px-4 py-3"
            >
              {article.sponsor.logo && (
                <img src={article.sponsor.logo} alt="" className="h-9 w-9 rounded-lg object-contain" loading="lazy" />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  Contenu sponsorisé
                </p>
                <p className="truncate text-sm font-bold text-text-primary">{article.sponsor.name}</p>
              </div>
            </a>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FavoriteButton
              type={article.type === "video" ? "video" : "article"}
              refId={article.slug}
              title={article.title}
              href={`/articles/${article.slug}`}
            />
            <ShareButtons
              url={`/articles/${article.slug}`}
              title={article.title}
              description={article.excerpt}
              hashtags={["WerguYaram", "Santé"]}
            />
          </div>

          <div className="mt-6 space-y-8">
            {article.body.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-xl font-bold text-text-primary">{section.heading}</h2>
                {section.paragraphs.map((p, i) => (
                  <p key={i} className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                    {p}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 space-y-2">
                    {section.bullets.map((b) => (
                      <li key={b} className="flex gap-2 text-[15px] text-text-secondary">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Sources */}
          <div className="mt-8 rounded-3xl bg-brand-mint p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <BadgeCheck className="h-4 w-4 text-brand-green" /> Sources médicales vérifiées
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-text-secondary">
              {article.sources.map((s) => (
                <li key={s.label}>
                  • {s.label} — <span className="font-medium">{s.org}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        {/* Right sidebar */}
        <aside className="space-y-5">
          {related.length > 0 && (
            <SidebarPanel title="Articles liés">
              <div className="space-y-3">
                {related.map((a) => a && <ArticleCard key={a.slug} article={a} />)}
              </div>
            </SidebarPanel>
          )}
          {meds.length > 0 && (
            <SidebarPanel title="Médicaments fréquents">
              <div className="space-y-2">
                {meds.map((m) => m && <MedicationCard key={m.slug} medication={m} />)}
              </div>
            </SidebarPanel>
          )}

          {specialists.length > 0 && (
            <SidebarPanel title="Spécialistes à proximité" icon={<Stethoscope className="h-4 w-4" />} action={{ label: "Carte", to: "/carte" }}>
              <ul className="space-y-2">
                {specialists.map((f) => (
                  <li key={f.slug}>
                    <Link
                      to={`/etablissements/${f.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-border-soft px-3 py-2 transition-colors hover:border-brand-teal"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-mint text-brand-green">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{f.name}</p>
                        <p className="truncate text-xs text-text-secondary">{f.region}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </SidebarPanel>
          )}

          <div className="rounded-3xl bg-brand-gradient p-5 text-white">
            <Users className="h-7 w-7" />
            <h3 className="mt-2 font-bold">Échangez avec la communauté</h3>
            <p className="mt-1 text-sm text-white/85">
              Posez vos questions et partagez votre expérience sur le forum santé.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/forum" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-brand-green">
                <MessageCircle className="h-4 w-4" /> Forum
              </Link>
              <Link to="/communautes" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-semibold text-white">
                Communautés
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Trust stats strip */}
      <TrustStatsBar
        className="mt-10"
        variant="light"
        title="Une plateforme de confiance"
        subtitle="Des contenus vérifiés par des professionnels de santé."
        stats={trustStats}
      />
    </div>
  );
}

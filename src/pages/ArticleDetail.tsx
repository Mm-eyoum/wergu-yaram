import { useParams } from "react-router-dom";
import { BadgeCheck, Bookmark, Clock, PlayCircle, Share2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { MedicationCard } from "@/components/cards/MedicationCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { articleBySlug, medicationBySlug } from "@/services/content";
import { formatDate } from "@/lib/format";

export default function ArticleDetail() {
  const { slug } = useParams();
  const article = slug ? articleBySlug(slug) : undefined;

  if (!article) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Article introuvable" message="Ce contenu n'existe pas ou a été déplacé." />
      </div>
    );
  }

  const related = article.relatedArticles.map((s) => articleBySlug(s)).filter(Boolean);
  const meds = article.relatedMedications.map((s) => medicationBySlug(s)).filter(Boolean);

  return (
    <div className="container-page py-6">
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
            <img src={article.cover} alt="" className="h-56 w-full object-cover sm:h-72" />
            {article.type === "video" && (
              <span className="absolute inset-0 grid place-items-center bg-black/25">
                <PlayCircle className="h-16 w-16 text-white" />
              </span>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border-soft px-3 py-1.5 text-sm text-text-secondary hover:border-brand-teal hover:text-brand-green">
              <Share2 className="h-4 w-4" /> Partager
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border-soft px-3 py-1.5 text-sm text-text-secondary hover:border-brand-teal hover:text-brand-green">
              <Bookmark className="h-4 w-4" /> Enregistrer
            </button>
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
        </aside>
      </div>
    </div>
  );
}

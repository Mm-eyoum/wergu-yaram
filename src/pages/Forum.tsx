import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageSquare, Plus, Search, ShieldCheck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { FormInput } from "@/components/ui/FormInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewThreadDialog } from "@/components/forum/NewThreadDialog";
import { FORUM_CONTRIBUTORS, FORUM_TOPICS, forumThreads as seedThreads } from "@/services/content";
import { fetchForumThreads } from "@/services/forum";
import { usePagination } from "@/hooks/usePagination";
import type { ForumKind } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

const KIND_LABEL: Record<ForumKind, string> = {
  question: "Question",
  discussion: "Discussion",
  conseil: "Conseil",
};

const TABS: TabItem[] = [
  { key: "all", label: "Tous" },
  { key: "question", label: "Questions" },
  { key: "discussion", label: "Discussions" },
  { key: "conseil", label: "Conseils" },
];

const RULES = [
  "Restez bienveillant et respectueux",
  "Pas de diagnostic médical en ligne",
  "Citez vos sources quand c'est possible",
  "Protégez votre vie privée",
];

export default function Forum() {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  const realThreads = useQuery({ queryKey: ["forumThreads"], queryFn: fetchForumThreads });

  const threads = useMemo(() => {
    const all = [...(realThreads.data ?? []), ...seedThreads];
    return all.filter((t) => {
      const matchTab = tab === "all" || t.kind === tab;
      const matchQuery =
        !query.trim() ||
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
      return matchTab && matchQuery;
    });
  }, [tab, query, realThreads.data]);

  const { paged, hasMore, remaining, showMore } = usePagination(threads, 10);

  return (
    <div>
      <SEOHead
        title="Forum santé"
        description="Posez vos questions, partagez vos expériences et obtenez des réponses de la communauté et de professionnels de santé sur Wergu Yaram."
        canonicalPath="/forum"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Forum", path: "/forum" },
        ])}
      />
      <section className="bg-mint-fade">
        <div className="container-page py-12 text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            Forum <span className="text-brand-green">santé</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-text-secondary">
            Posez vos questions, partagez vos expériences et obtenez des réponses de la communauté
            et de professionnels de santé.
          </p>
          <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <FormInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une question…"
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Button size="lg" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4" /> Poser une question
            </Button>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_300px]">
        <div>
          <Tabs items={TABS} active={tab} onChange={setTab} className="mb-5" />

          {threads.length === 0 ? (
            <EmptyState title="Aucune question" message="Essayez un autre mot-clé ou posez votre question." />
          ) : (
            <div className="space-y-4">
              {paged.map((thread) => (
                <article key={thread.id} className="card-surface flex gap-4 p-5">
                  <div className="hidden flex-col items-center gap-1 text-center sm:flex">
                    <span className="text-lg font-extrabold text-text-primary">{thread.votes}</span>
                    <span className="text-[11px] text-text-secondary">votes</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-green">
                      <MessageSquare className="h-4 w-4" /> {thread.answers}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Badge tone="navy">{KIND_LABEL[thread.kind]}</Badge>
                      {thread.solved && (
                        <Badge tone="green" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                          Résolu
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-text-primary hover:text-brand-green">{thread.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{thread.excerpt}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {thread.tags.map((tag) => (
                        <Badge key={tag} tone="mint">
                          {tag}
                        </Badge>
                      ))}
                      <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-text-secondary">
                        <Avatar name={thread.author.name} size="xs" />
                        {thread.author.name} · {thread.timeAgo}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={showMore}>
                    Voir plus ({remaining})
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <SidebarPanel title="Thèmes populaires" icon={<TrendingUp className="h-4 w-4" />}>
            <div className="flex flex-wrap gap-2">
              {FORUM_TOPICS.map((topic) => (
                <Badge key={topic.label} tone="neutral">
                  {topic.label} · {topic.count}
                </Badge>
              ))}
            </div>
          </SidebarPanel>

          <SidebarPanel title="Top contributeurs">
            <ul className="space-y-3">
              {FORUM_CONTRIBUTORS.map((c) => (
                <li key={c.name} className="flex items-center gap-3">
                  <Avatar name={c.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{c.name}</p>
                    <p className="text-xs text-text-secondary">{c.role}</p>
                  </div>
                  <span className="text-xs font-semibold text-brand-green">{c.answers}</span>
                </li>
              ))}
            </ul>
          </SidebarPanel>

          <SidebarPanel title="Règles de la communauté" icon={<ShieldCheck className="h-4 w-4" />}>
            <ul className="space-y-2 text-sm text-text-secondary">
              {RULES.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  {rule}
                </li>
              ))}
            </ul>
          </SidebarPanel>
        </aside>
      </div>

      {showDialog && <NewThreadDialog onClose={() => setShowDialog(false)} />}
    </div>
  );
}

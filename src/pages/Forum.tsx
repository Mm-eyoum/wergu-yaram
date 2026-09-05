import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, HelpCircle, LifeBuoy, MessageSquare, Plus, Search, ShieldCheck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { FormInput } from "@/components/ui/FormInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewThreadDialog } from "@/components/forum/NewThreadDialog";
import { LoadingState } from "@/components/ui/LoadingState";
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

  // Real forum threads only — no mock/seed data is ever merged in.
  const allThreads = useMemo(() => realThreads.data ?? [], [realThreads.data]);

  const threads = useMemo(() => {
    return allThreads.filter((t) => {
      const matchTab = tab === "all" || t.kind === tab;
      const matchQuery =
        !query.trim() ||
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
      return matchTab && matchQuery;
    });
  }, [allThreads, tab, query]);

  // Discussion categories with live counts (drives the left-rail filters).
  const categories = useMemo(
    () =>
      (Object.keys(KIND_LABEL) as ForumKind[]).map((kind) => ({
        kind,
        label: KIND_LABEL[kind],
        count: allThreads.filter((t) => t.kind === kind).length,
      })),
    [allThreads],
  );

  // Popular topics derived from the real threads' tags (most frequent first).
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of allThreads) {
      for (const tag of t.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([label, count]) => ({ label, count }));
  }, [allThreads]);

  // Unanswered questions surfaced in the right rail.
  const unanswered = useMemo(
    () => allThreads.filter((t) => t.kind === "question" && t.answers === 0).slice(0, 5),
    [allThreads],
  );

  const { pageItems, page, pageCount, setPage } = usePagination(threads, 10);

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

      <div className="container-page grid gap-6 py-8 lg:grid-cols-[260px_1fr_300px]">
        {/* Left rail: topics + categories + help */}
        <aside className="hidden space-y-5 lg:block">
          {topics.length > 0 && (
            <SidebarPanel title="Thèmes populaires" icon={<TrendingUp className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Badge key={topic.label} tone="neutral">
                    {topic.label} · {topic.count}
                  </Badge>
                ))}
              </div>
            </SidebarPanel>
          )}

          <SidebarPanel title="Catégories de discussion" icon={<MessageSquare className="h-4 w-4" />}>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setTab("all")}
                  className={`flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm ${
                    tab === "all" ? "bg-brand-mint font-semibold text-brand-green" : "text-text-secondary hover:bg-brand-soft"
                  }`}
                >
                  <span>Tous les sujets</span>
                  <span className="text-xs">{allThreads.length}</span>
                </button>
              </li>
              {categories.map((c) => (
                <li key={c.kind}>
                  <button
                    onClick={() => setTab(c.kind)}
                    className={`flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm ${
                      tab === c.kind ? "bg-brand-mint font-semibold text-brand-green" : "text-text-secondary hover:bg-brand-soft"
                    }`}
                  >
                    <span>{c.label}s</span>
                    <span className="text-xs">{c.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </SidebarPanel>

          <div className="rounded-3xl bg-brand-gradient p-5 text-white">
            <LifeBuoy className="h-6 w-6" />
            <h3 className="mt-3 text-base font-bold">Besoin d'aide ?</h3>
            <p className="mt-1 text-sm text-white/85">
              Une question urgente ? Posez-la à la communauté et à nos professionnels de santé.
            </p>
            <button
              onClick={() => setShowDialog(true)}
              className="mt-3 inline-flex rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-brand-green"
            >
              Poser une question
            </button>
          </div>
        </aside>

        <div>
          <Tabs items={TABS} active={tab} onChange={setTab} className="mb-5" />

          {realThreads.isLoading ? (
            <LoadingState />
          ) : threads.length === 0 ? (
            <EmptyState
              title="Aucune question pour l'instant"
              message="Soyez le premier à poser une question à la communauté."
            />
          ) : (
            <div className="space-y-4">
              {pageItems.map((thread) => (
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
                        {thread.author.name}
                        {thread.author.role && (
                          <Badge tone="green" icon={<ShieldCheck className="h-3 w-3" />}>
                            {thread.author.role}
                          </Badge>
                        )}
                        · {thread.timeAgo}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
              <Pagination className="pt-2" page={page} pageCount={pageCount} onChange={setPage} />
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <SidebarPanel title="Questions sans réponses" icon={<HelpCircle className="h-4 w-4" />}>
            {unanswered.length ? (
              <ul className="space-y-3">
                {unanswered.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setQuery(t.title)}
                      className="block w-full text-left text-sm font-medium text-text-primary hover:text-brand-green"
                    >
                      {t.title}
                    </button>
                    <p className="mt-0.5 text-xs text-text-secondary">{t.author.name} · {t.timeAgo}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">Toutes les questions ont une réponse 🎉</p>
            )}
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

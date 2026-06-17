import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/useToast";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { fetchForumThreads } from "@/services/forum";
import {
  fetchAllCommunityPosts,
  deleteCommunityPost,
  deleteForumThread,
  type ModeratablePost,
} from "@/services/admin/moderationContent";
import type { ForumThread } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

type Tab = "forum" | "communities";
type Target = { kind: "thread"; item: ForumThread } | { kind: "post"; item: ModeratablePost };

export default function Comments() {
  const [tab, setTab] = useState<Tab>("forum");
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Target | null>(null);

  const threads = useQuery({ queryKey: ["admin", "moderation", "threads"], queryFn: fetchForumThreads, enabled: tab === "forum" });
  const posts = useQuery({ queryKey: ["admin", "moderation", "posts"], queryFn: () => fetchAllCommunityPosts(), enabled: tab === "communities" });

  const remove = useMutation({
    mutationFn: (t: Target) =>
      t.kind === "thread" ? deleteForumThread(t.item) : deleteCommunityPost(t.item),
    onSuccess: (_d, t) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "moderation"] });
      queryClient.invalidateQueries({ queryKey: t.kind === "thread" ? ["forum"] : ["communities"] });
      notify("Contenu supprimé.", "success");
      setTarget(null);
    },
    onError: () => {
      notify("Suppression impossible (droits insuffisants ?).", "error");
      setTarget(null);
    },
  });

  const active = tab === "forum" ? threads : posts;

  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Modération des contributions" noIndex />
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Contributions des membres</h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          Surveillez et retirez les discussions du forum et les publications des communautés.
        </p>
      </header>

      <div className="mb-5 inline-flex rounded-xl bg-brand-soft p-1 dark:bg-white/5">
        {([["forum", "Forum"], ["communities", "Communautés"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
              tab === key ? "bg-white text-brand-green shadow-soft dark:bg-white/10 dark:text-white" : "text-text-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {active.isLoading ? (
        <LoadingState />
      ) : active.isError ? (
        <ErrorState onRetry={active.refetch} />
      ) : tab === "forum" ? (
        threads.data && threads.data.length > 0 ? (
          <ul className="space-y-3">
            {threads.data.map((t) => (
              <li key={t.id} className="card-surface flex items-start gap-3 p-4 dark:bg-white/5">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone="navy">{t.kind}</Badge>
                    <span className="text-xs text-text-secondary">{t.author?.name} · {t.timeAgo}</span>
                  </div>
                  <p className="font-semibold text-text-primary dark:text-white">{t.title}</p>
                  <p className="line-clamp-2 text-sm text-text-secondary dark:text-white/60">{t.excerpt}</p>
                </div>
                <button
                  type="button"
                  aria-label="Supprimer"
                  onClick={() => setTarget({ kind: "thread", item: t })}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-danger/10"
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Aucune discussion" message="Le forum ne contient pas encore de discussions." />
        )
      ) : posts.data && posts.data.length > 0 ? (
        <ul className="space-y-3">
          {posts.data.map((p) => (
            <li key={p.path} className="card-surface flex items-start gap-3 p-4 dark:bg-white/5">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-xs text-text-secondary">
                  <span className="font-medium text-text-primary dark:text-white/90">{p.author}</span>
                  <span>· {p.timeAgo}</span>
                  {p.communitySlug && (
                    <Link to={`/communautes/${p.communitySlug}`} className="inline-flex items-center gap-0.5 text-brand-green hover:underline">
                      {p.communitySlug} <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <p className="text-sm text-text-primary dark:text-white/90">{p.content}</p>
              </div>
              <button
                type="button"
                aria-label="Supprimer"
                onClick={() => setTarget({ kind: "post", item: p })}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-danger/10"
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Aucune publication" message="Les communautés ne contiennent pas encore de publications." />
      )}

      {target && (
        <ConfirmDialog
          title="Supprimer ce contenu ?"
          message="Cette action est irréversible et retire définitivement la contribution du membre."
          confirmLabel="Supprimer"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(target)}
          onCancel={() => setTarget(null)}
        />
      )}
    </div>
  );
}

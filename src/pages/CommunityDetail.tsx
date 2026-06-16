import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, ShieldCheck, Users } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { CommunityComposer } from "@/components/community/CommunityComposer";
import { JoinCommunityButton } from "@/components/community/JoinCommunityButton";
import { PostCard } from "@/components/community/PostCard";
import { EventCard } from "@/components/cards/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useCommunities, useCommunity, useEvents } from "@/hooks/useCatalog";
import { fetchCommunityPosts } from "@/services/communityPosts";
import { formatCompact } from "@/lib/format";
import { SEOHead } from "@/seo/SEOHead";
import { communityJsonLd, breadcrumbJsonLd } from "@/seo/jsonld";
import { ShareButtons } from "@/components/ShareButtons";

export default function CommunityDetail() {
  const { slug } = useParams();
  const { data: community, isLoading } = useCommunity(slug);
  const { data: communities = [] } = useCommunities();
  const { data: allEvents = [] } = useEvents();

  const realPosts = useQuery({
    queryKey: ["communityPosts", slug],
    queryFn: () => fetchCommunityPosts(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="container-page py-16">
        <LoadingState label="Chargement de la communauté…" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Communauté introuvable" noIndex />
        <EmptyState title="Communauté introuvable" message="Cette communauté n'existe pas ou a été retirée." />
      </div>
    );
  }

  const events = community.upcomingEvents
    .map((id) => allEvents.find((e) => e.id === id))
    .filter(Boolean);

  return (
    <div className="container-page py-6">
      <SEOHead
        title={community.name}
        description={community.description}
        ogType="website"
        ogImage={`/og/communaute-${community.slug}.png`}
        jsonLd={[
          communityJsonLd(community),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Communautés", path: "/communautes" },
            { name: community.name, path: `/communautes/${community.slug}` },
          ]),
        ]}
      />
      <Breadcrumb
        items={[
          { label: "Accueil", to: "/" },
          { label: "Communautés", to: "/communautes" },
          { label: community.name },
        ]}
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-[260px_1fr_300px]">
        {/* Left: communities list */}
        <aside className="hidden lg:block">
          <SidebarPanel title="Mes communautés" icon={<Users className="h-4 w-4" />}>
            <ul className="space-y-1">
              {communities.map((c) => (
                <li key={c.slug}>
                  <a
                    href={`/communautes/${c.slug}`}
                    className={`flex items-center gap-2 rounded-xl px-2 py-2 text-sm ${
                      c.slug === community.slug
                        ? "bg-brand-mint font-semibold text-brand-green"
                        : "text-text-secondary hover:bg-brand-soft"
                    }`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-mint text-brand-green">
                      <Users className="h-4 w-4" />
                    </span>
                    <span className="truncate">{c.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </SidebarPanel>
        </aside>

        {/* Center: header + composer + feed */}
        <div className="space-y-5">
          <div className="card-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white">
                  <Users className="h-7 w-7" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold">{community.name}</h1>
                    {community.isPublic && <Badge tone="green">Publique</Badge>}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {formatCompact(community.membersCount)} membres · {formatCompact(community.postsCount)} publications
                  </p>
                </div>
              </div>
              <JoinCommunityButton slug={community.slug} name={community.name} />
            </div>
            <p className="mt-3 text-sm text-text-secondary">{community.description}</p>
            <ShareButtons
              className="mt-3"
              url={`/communautes/${community.slug}`}
              title={community.name}
              description={community.description}
              hashtags={["WerguYaram", "Communauté"]}
            />
          </div>

          <CommunityComposer communitySlug={community.slug} />

          <div className="space-y-4">
            {(() => {
              const posts = [...(realPosts.data ?? []), ...community.posts];
              return posts.length ? (
                posts.map((post) => <PostCard key={post.id} post={post} />)
              ) : (
                <EmptyState title="Aucune publication" message="Soyez le premier à partager dans cette communauté." />
              );
            })()}
          </div>
        </div>

        {/* Right: resources + events + rules */}
        <aside className="space-y-5">
          <SidebarPanel title="Ressources recommandées" icon={<BookOpen className="h-4 w-4" />}>
            <ul className="space-y-2">
              {community.resources.map((r) => (
                <li key={r.title} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-text-secondary">{r.title}</span>
                  <Badge tone="neutral">{r.type}</Badge>
                </li>
              ))}
            </ul>
          </SidebarPanel>

          {events.length > 0 && (
            <SidebarPanel title="Événements à venir">
              <div className="space-y-3">
                {events.map((e) => e && <EventCard key={e.id} event={e} compact />)}
              </div>
            </SidebarPanel>
          )}

          <SidebarPanel title="Règles de la communauté" icon={<ShieldCheck className="h-4 w-4" />}>
            <ul className="space-y-2 text-sm text-text-secondary">
              {community.rules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  {rule}
                </li>
              ))}
            </ul>
          </SidebarPanel>
        </aside>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Compass, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
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

type CommunityTab = "fil" | "membres" | "ressources" | "evenements" | "apropos";

export default function CommunityDetail() {
  const { t } = useTranslation(["community", "common"]);
  const { slug } = useParams();
  const [tab, setTab] = useState<CommunityTab>("fil");
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
        <LoadingState label={t("loading")} />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container-page py-16">
        <SEOHead title={t("notFoundTitle")} noIndex />
        <EmptyState title={t("notFoundTitle")} message={t("notFoundMsg")} />
      </div>
    );
  }

  const events = community.upcomingEvents
    .map((id) => allEvents.find((e) => e.id === id))
    .filter(Boolean);

  const posts = [...(realPosts.data ?? []), ...community.posts];

  // Active members derived from post authors (most recent first, deduplicated).
  const activeMembers = (() => {
    const seen = new Map<string, { name: string; role?: string }>();
    for (const post of posts) {
      if (!seen.has(post.author.name)) seen.set(post.author.name, post.author);
    }
    return [...seen.values()].slice(0, 12);
  })();

  // Suggestions = other communities the user can discover.
  const discover = communities.filter((c) => c.slug !== community.slug).slice(0, 4);

  const tabs = [
    { key: "fil", label: t("tabs.feed"), count: posts.length },
    { key: "membres", label: t("tabs.members"), count: community.membersCount },
    { key: "ressources", label: t("tabs.resources"), count: community.resources.length },
    { key: "evenements", label: t("tabs.events"), count: events.length },
    { key: "apropos", label: t("tabs.about") },
  ];

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
            { name: t("common:breadcrumb.home"), path: "/" },
            { name: t("common:contentTypes.communaute"), path: "/communautes" },
            { name: community.name, path: `/communautes/${community.slug}` },
          ]),
        ]}
      />
      <Breadcrumb
        items={[
          { label: t("common:breadcrumb.home"), to: "/" },
          { label: t("common:contentTypes.communaute"), to: "/communautes" },
          { label: community.name },
        ]}
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-[260px_1fr_300px]">
        {/* Left: communities list + discover + entraide promo */}
        <aside className="hidden space-y-5 lg:block">
          <SidebarPanel title={t("myCommunities")} icon={<Users className="h-4 w-4" />}>
            <ul className="space-y-1">
              {communities.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/communautes/${c.slug}`}
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
                  </Link>
                </li>
              ))}
            </ul>
          </SidebarPanel>

          {discover.length > 0 && (
            <SidebarPanel
              title={t("discover")}
              icon={<Compass className="h-4 w-4" />}
              action={{ label: t("seeAll"), to: "/communautes" }}
            >
              <ul className="space-y-2">
                {discover.map((c) => (
                  <li key={c.slug}>
                    <Link
                      to={`/communautes/${c.slug}`}
                      className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm text-text-secondary hover:bg-brand-soft"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="shrink-0 text-xs text-text-secondary">
                        {formatCompact(c.membersCount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SidebarPanel>
          )}

          <div className="rounded-3xl bg-brand-gradient p-5 text-white">
            <HeartHandshake className="h-6 w-6" />
            <h3 className="mt-3 text-base font-bold">{t("entraideTitle")}</h3>
            <p className="mt-1 text-sm text-white/85">{t("entraideText")}</p>
            <Link
              to="/forum"
              className="mt-3 inline-flex rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-brand-green"
            >
              {t("joinEntraide")}
            </Link>
          </div>
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
                    {community.isPublic && <Badge tone="green">{t("public")}</Badge>}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {t("stats", { members: formatCompact(community.membersCount), posts: formatCompact(community.postsCount) })}
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
            <Tabs
              className="mt-4"
              items={tabs}
              active={tab}
              onChange={(k) => setTab(k as CommunityTab)}
            />
          </div>

          {tab === "fil" && (
            <>
              <CommunityComposer communitySlug={community.slug} />
              <div className="space-y-4">
                {posts.length ? (
                  posts.map((post) => <PostCard key={post.id} post={post} />)
                ) : (
                  <EmptyState title={t("noPostsTitle")} message={t("noPostsMsg")} />
                )}
              </div>
            </>
          )}

          {tab === "membres" && (
            <div className="card-surface p-6">
              <h2 className="text-base font-bold">{t("membersActive")}</h2>
              {activeMembers.length ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {activeMembers.map((m) => (
                    <li key={m.name} className="flex items-center gap-3 rounded-2xl border border-border-soft p-3">
                      <Avatar name={m.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{m.name}</p>
                        {m.role && <p className="truncate text-xs text-text-secondary">{m.role}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-text-secondary">{t("noActiveMembers")}</p>
              )}
            </div>
          )}

          {tab === "ressources" && (
            <div className="card-surface p-6">
              <h2 className="text-base font-bold">{t("resourcesTitle")}</h2>
              <ul className="mt-4 space-y-2">
                {community.resources.map((r) => (
                  <li key={r.title} className="flex items-center justify-between gap-2 rounded-2xl border border-border-soft p-3 text-sm">
                    <span className="text-text-secondary">{r.title}</span>
                    <Badge tone="neutral">{r.type}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "evenements" && (
            <div className="space-y-3">
              {events.length ? (
                events.map((e) => e && <EventCard key={e.id} event={e} />)
              ) : (
                <EmptyState title={t("noEventsTitle")} message={t("noEventsMsg")} />
              )}
            </div>
          )}

          {tab === "apropos" && (
            <div className="card-surface space-y-4 p-6">
              <div>
                <h2 className="text-base font-bold">{t("about")}</h2>
                <p className="mt-2 text-sm text-text-secondary">{community.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold">{t("rulesTitle")}</h3>
                <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                  {community.rules.map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right: active members + resources + events + rules */}
        <aside className="space-y-5">
          <SidebarPanel
            title={t("membersActive")}
            icon={<Users className="h-4 w-4" />}
            action={{ label: t("seeAllShort"), to: `/communautes/${community.slug}` }}
          >
            {activeMembers.length ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {activeMembers.slice(0, 8).map((m) => (
                    <Avatar key={m.name} name={m.name} size="sm" />
                  ))}
                </div>
                <p className="mt-3 text-xs text-text-secondary">
                  {t("totalMembers", { count: formatCompact(community.membersCount) })}
                </p>
              </>
            ) : (
              <p className="text-sm text-text-secondary">
                {t("membersCount", { count: formatCompact(community.membersCount) })}
              </p>
            )}
          </SidebarPanel>

          <SidebarPanel title={t("recommendedResources")} icon={<BookOpen className="h-4 w-4" />}>
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
            <SidebarPanel title={t("upcomingEvents")}>
              <div className="space-y-3">
                {events.map((e) => e && <EventCard key={e.id} event={e} compact />)}
              </div>
            </SidebarPanel>
          )}

          <SidebarPanel title={t("rulesTitle")} icon={<ShieldCheck className="h-4 w-4" />}>
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

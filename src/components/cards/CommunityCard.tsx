import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, Globe, Lock, Users } from "lucide-react";
import type { Community } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { formatCompact } from "@/lib/format";
import { PartnerAttribution } from "@/components/tenant/PartnerAttribution";
import { MetaItem, cardInteractive } from "./primitives";

export function CommunityCard({ community }: { community: Community }) {
  const { t } = useTranslation("cards");
  const events = community.upcomingEvents?.length ?? 0;
  return (
    <Link to={`/communautes/${community.slug}`} className={`${cardInteractive} flex flex-col gap-3 p-4`}>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
          <Users className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-text-primary group-hover:text-brand-green">
            {community.name}
          </h3>
          <p className="text-xs text-text-secondary">
            {t("communityStats", {
              members: formatCompact(community.membersCount),
              posts: formatCompact(community.postsCount),
            })}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green transition-colors group-hover:bg-brand-green group-hover:text-white">
          {t("join")}
        </span>
      </div>

      {community.description && (
        <p className="line-clamp-2 text-sm text-text-secondary">{community.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="outline" icon={community.isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}>
          {community.isPublic ? t("public") : t("private")}
        </Badge>
        {events > 0 && (
          <MetaItem icon={<CalendarDays className="h-3.5 w-3.5" />}>
            {t("events", { count: events })}
          </MetaItem>
        )}
      </div>
      {community.tenantSlug && <PartnerAttribution tenantSlug={community.tenantSlug} />}
    </Link>
  );
}

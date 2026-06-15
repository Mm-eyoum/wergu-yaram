import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import type { Community } from "@/types/domain";
import { formatCompact } from "@/lib/format";

export function CommunityCard({ community }: { community: Community }) {
  return (
    <Link
      to={`/communautes/${community.slug}`}
      className="card-surface group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
        <Users className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold text-text-primary group-hover:text-brand-green">
          {community.name}
        </h3>
        <p className="text-xs text-text-secondary">
          {formatCompact(community.membersCount)} membres · {formatCompact(community.postsCount)} publications
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green">
        Rejoindre
      </span>
    </Link>
  );
}

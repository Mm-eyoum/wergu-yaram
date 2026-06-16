import { Link } from "react-router-dom";
import { BadgeCheck, Clock, Newspaper, PlayCircle } from "lucide-react";
import type { Article } from "@/types/domain";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/format";
import { CardMedia, OverlayBadge, MetaItem, cardInteractive } from "./primitives";

export function ArticleCard({ article }: { article: Article }) {
  const isVideo = article.type === "video";
  return (
    <Link to={`/articles/${article.slug}`} className={`${cardInteractive} block overflow-hidden`}>
      <CardMedia
        src={article.cover}
        fallback={<Newspaper className="h-9 w-9" />}
        height="lg"
        overlayTopLeft={<OverlayBadge className="text-brand-green">{article.category}</OverlayBadge>}
        overlayTopRight={
          article.trust?.verified ? (
            <OverlayBadge className="text-brand-green" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
              Vérifié
            </OverlayBadge>
          ) : undefined
        }
      >
        {isVideo && (
          <span className="absolute inset-0 grid place-items-center bg-black/20">
            <PlayCircle className="h-12 w-12 text-white drop-shadow" />
          </span>
        )}
      </CardMedia>

      <div className="p-4">
        <h3 className="line-clamp-2 font-bold text-text-primary group-hover:text-brand-green">
          {article.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{article.excerpt}</p>

        <div className="mt-3 flex items-center gap-2 border-t border-border-soft pt-3">
          <Avatar name={article.author.name} size="xs" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-text-primary">{article.author.name}</p>
            <p className="truncate text-[11px] text-text-secondary">{article.author.role}</p>
          </div>
          <MetaItem icon={<Clock className="h-3.5 w-3.5" />}>
            {isVideo ? article.videoDurationLabel : `${article.readingMinutes} min`}
          </MetaItem>
        </div>
        <p className="mt-1.5 text-[11px] text-text-secondary">{formatDate(article.publishedAt)}</p>
      </div>
    </Link>
  );
}

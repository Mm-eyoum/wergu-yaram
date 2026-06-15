import { Link } from "react-router-dom";
import { Clock, PlayCircle } from "lucide-react";
import type { Article } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="card-surface group overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-card">
      <Link to={`/articles/${article.slug}`} className="block">
        <div className="relative h-40 overflow-hidden">
          <img
            src={article.cover}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          {article.type === "video" && (
            <span className="absolute inset-0 grid place-items-center bg-black/20">
              <PlayCircle className="h-12 w-12 text-white drop-shadow" />
            </span>
          )}
          <span className="absolute left-3 top-3">
            <Badge tone="mint">{article.category}</Badge>
          </span>
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 font-bold text-text-primary group-hover:text-brand-green">
            {article.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{article.excerpt}</p>
          <div className="mt-3 flex items-center gap-3 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.type === "video"
                ? article.videoDurationLabel
                : `${article.readingMinutes} min`}
            </span>
            <span>·</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

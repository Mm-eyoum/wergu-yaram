import { Heart, MessageCircle, Share2 } from "lucide-react";
import type { CommunityPost } from "@/types/domain";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export function PostCard({ post }: { post: CommunityPost }) {
  return (
    <article className="card-surface p-5">
      <header className="flex items-center gap-3">
        <Avatar name={post.author.name} size="md" />
        <div>
          <p className="text-sm font-bold text-text-primary">{post.author.name}</p>
          <p className="text-xs text-text-secondary">
            {post.author.role ? `${post.author.role} · ` : ""}
            {post.timeAgo}
          </p>
        </div>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-text-primary">{post.content}</p>

      {post.tags && post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag} tone="mint">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <footer className="mt-4 flex items-center gap-5 border-t border-border-soft pt-3 text-sm text-text-secondary">
        <button className="inline-flex items-center gap-1.5 hover:text-brand-green">
          <Heart className="h-4 w-4" /> {post.likes}
        </button>
        <button className="inline-flex items-center gap-1.5 hover:text-brand-green">
          <MessageCircle className="h-4 w-4" /> {post.comments}
        </button>
        <button className="inline-flex items-center gap-1.5 hover:text-brand-green">
          <Share2 className="h-4 w-4" /> {post.shares}
        </button>
      </footer>
    </article>
  );
}

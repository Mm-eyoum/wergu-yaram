import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Pill, Stethoscope, Hospital, Users, FileText, PlayCircle, Calendar, HeartHandshake, Activity } from "lucide-react";
import type { ContentType, SearchHit } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";

const TYPE_META: Record<ContentType, { label: string; icon: React.ReactNode }> = {
  pathologie: { label: "Pathologie", icon: <Activity className="h-4 w-4" /> },
  medicament: { label: "Médicament", icon: <Pill className="h-4 w-4" /> },
  symptome: { label: "Symptôme", icon: <Stethoscope className="h-4 w-4" /> },
  article: { label: "Article", icon: <FileText className="h-4 w-4" /> },
  video: { label: "Vidéo", icon: <PlayCircle className="h-4 w-4" /> },
  etablissement: { label: "Établissement", icon: <Hospital className="h-4 w-4" /> },
  communaute: { label: "Communauté", icon: <Users className="h-4 w-4" /> },
  evenement: { label: "Événement", icon: <Calendar className="h-4 w-4" /> },
  besoin: { label: "Besoin", icon: <HeartHandshake className="h-4 w-4" /> },
  partenaire: { label: "Partenaire", icon: <Users className="h-4 w-4" /> },
};

/** Rich universal result card used on the search results page. */
export function ResultCard({ hit }: { hit: SearchHit }) {
  const meta = TYPE_META[hit.type];
  return (
    <article className="card-surface flex gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5">
      {hit.thumbnail ? (
        <Link to={hit.href} className="hidden shrink-0 sm:block">
          <img
            src={hit.thumbnail}
            alt=""
            className="h-24 w-32 rounded-2xl object-cover"
            loading="lazy"
          />
        </Link>
      ) : (
        <Link
          to={hit.href}
          className="hidden h-24 w-32 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green sm:grid"
          aria-hidden
        >
          {meta.icon}
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Badge tone="mint" icon={meta.icon}>
            {meta.label}
          </Badge>
          {hit.verified && (
            <Badge tone="green" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
              Vérifié
            </Badge>
          )}
          {hit.badge && <Badge tone="warning">{hit.badge}</Badge>}
        </div>

        <h3 className="truncate text-base font-bold text-text-primary">
          <Link to={hit.href} className="hover:text-brand-green">
            {hit.title}
          </Link>
        </h3>
        {hit.meta && <p className="text-xs text-text-secondary">{hit.meta}</p>}
        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{hit.description}</p>

        <Link
          to={hit.href}
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:gap-1.5"
        >
          Voir le détail <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

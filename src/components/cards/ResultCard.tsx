import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BadgeCheck, Pill, Stethoscope, Hospital, Users, FileText, PlayCircle, Calendar, HeartHandshake, Activity, GraduationCap } from "lucide-react";
import type { ContentType, SearchHit } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { PartnerAttribution } from "@/components/tenant/PartnerAttribution";

const TYPE_ICON: Record<ContentType, React.ReactNode> = {
  pathologie: <Activity className="h-4 w-4" />,
  medicament: <Pill className="h-4 w-4" />,
  symptome: <Stethoscope className="h-4 w-4" />,
  article: <FileText className="h-4 w-4" />,
  video: <PlayCircle className="h-4 w-4" />,
  etablissement: <Hospital className="h-4 w-4" />,
  communaute: <Users className="h-4 w-4" />,
  evenement: <Calendar className="h-4 w-4" />,
  besoin: <HeartHandshake className="h-4 w-4" />,
  partenaire: <Users className="h-4 w-4" />,
  formation: <GraduationCap className="h-4 w-4" />,
};

/** Rich universal result card used on the search results page. */
export function ResultCard({ hit }: { hit: SearchHit }) {
  const { t } = useTranslation(["cards", "common"]);
  const icon = TYPE_ICON[hit.type];
  const typeLabel = t(`common:contentTypesSingular.${hit.type}`);
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
          {icon}
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Badge tone="mint" icon={icon}>
            {typeLabel}
          </Badge>
          {hit.verified && (
            <Badge tone="green" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
              {t("verified")}
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
        {hit.tenantSlug && <PartnerAttribution tenantSlug={hit.tenantSlug} asLink className="mt-1.5" />}

        <Link
          to={hit.href}
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:gap-1.5"
        >
          {t("viewDetail")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Partner } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { initials } from "@/lib/format";
import { PillList, cardInteractive } from "./primitives";

export function PartnerCard({
  partner,
  href,
  badge,
}: {
  partner: Partner;
  /** When set, the whole card links here (e.g. directory orgs → /structures/:id). */
  href?: string;
  /** Optional badge (e.g. "Annuaire") for non-catalog entries. */
  badge?: string;
}) {
  const inner = (
    <>
      <div className="mb-3 flex h-14 items-center justify-between">
        {partner.logo ? (
          <img src={partner.logo} alt={partner.name} className="max-h-12 max-w-[140px] object-contain" loading="lazy" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-mint font-bold text-brand-green">
            {initials(partner.name)}
          </span>
        )}
        {badge && <Badge tone="mint">{badge}</Badge>}
      </div>

      <Badge tone="mint" className="w-fit">
        {partner.categoryLabel}
      </Badge>
      <h3 className="mt-2 font-bold text-text-primary group-hover:text-brand-green">{partner.name}</h3>
      <p className="mt-1 line-clamp-3 flex-1 text-sm text-text-secondary">{partner.description}</p>

      {partner.tags.length > 0 && (
        <div className="mt-3">
          <PillList items={partner.tags} max={3} />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-soft pt-3">
        <span className="min-w-0 truncate text-xs text-text-secondary">
          {partner.contributionsLabel || partner.zone}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-green group-hover:gap-1.5">
          En savoir plus <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </>
  );

  return href ? (
    <Link to={href} className={`${cardInteractive} flex flex-col p-5`}>
      {inner}
    </Link>
  ) : (
    <article className="card-surface group flex flex-col p-5">{inner}</article>
  );
}

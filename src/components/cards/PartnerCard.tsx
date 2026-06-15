import { ArrowRight } from "lucide-react";
import type { Partner } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { initials } from "@/lib/format";

export function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <article className="card-surface flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
      <div className="mb-3 flex h-14 items-center">
        {partner.logo ? (
          <img src={partner.logo} alt={partner.name} className="max-h-12 max-w-[140px] object-contain" loading="lazy" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-mint font-bold text-brand-green">
            {initials(partner.name)}
          </span>
        )}
      </div>
      <Badge tone="mint" className="w-fit">
        {partner.categoryLabel}
      </Badge>
      <h3 className="mt-2 font-bold text-text-primary">{partner.name}</h3>
      <p className="mt-1 line-clamp-3 flex-1 text-sm text-text-secondary">{partner.description}</p>
      <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
        <span className="text-xs text-text-secondary">{partner.zone}</span>
        <button className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:gap-1.5">
          En savoir plus <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

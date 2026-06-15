import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import type { Facility } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";

export function FacilityCard({ facility }: { facility: Facility }) {
  return (
    <article className="card-surface group overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-card">
      <Link to={`/etablissements/${facility.slug}`}>
        <div className="h-32 overflow-hidden">
          <img
            src={facility.cover}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <Badge tone="navy">{facility.type}</Badge>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-primary">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {facility.rating.toFixed(1)}
            </span>
          </div>
          <h3 className="line-clamp-1 font-bold text-text-primary group-hover:text-brand-green">
            {facility.name}
          </h3>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-text-secondary">
            <MapPin className="h-3.5 w-3.5" />
            {facility.city}, {facility.region}
          </p>
        </div>
      </Link>
    </article>
  );
}

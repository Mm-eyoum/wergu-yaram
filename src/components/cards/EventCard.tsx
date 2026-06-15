import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { HealthEvent } from "@/types/domain";
import { dateChip } from "@/lib/format";

export function EventCard({ event, compact = false }: { event: HealthEvent; compact?: boolean }) {
  const chip = dateChip(event.startAt);
  return (
    <Link
      to={`/evenements/${event.id}`}
      className="card-surface group flex items-center gap-3 p-3 transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-mint text-center">
        <span className="text-lg font-extrabold leading-none text-brand-green">{chip.day}</span>
        <span className="text-[10px] font-semibold text-text-secondary">{chip.month}</span>
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-bold text-text-primary group-hover:text-brand-green">
          {event.title}
        </h3>
        {!compact && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-text-secondary">
            <MapPin className="h-3.5 w-3.5" />
            {event.city} · {event.timeLabel}
          </p>
        )}
      </div>
    </Link>
  );
}

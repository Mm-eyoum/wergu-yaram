import { Link } from "react-router-dom";
import { MapPin, Ticket, Users } from "lucide-react";
import type { HealthEvent } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { dateChip } from "@/lib/format";
import { MetaItem, cardInteractive } from "./primitives";

const isFree = (price: string) => /gratuit|free|^0/i.test(price.trim());

export function EventCard({ event, compact = false }: { event: HealthEvent; compact?: boolean }) {
  const chip = dateChip(event.startAt);
  const lowSeats = event.seatsLeft > 0 && event.seatsLeft <= 20;

  return (
    <Link to={`/evenements/${event.id}`} className={`${cardInteractive} flex items-start gap-3 p-3`}>
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-mint text-center">
        <span className="text-lg font-extrabold leading-none text-brand-green">{chip.day}</span>
        <span className="text-[10px] font-semibold uppercase text-text-secondary">{chip.month}</span>
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-bold text-text-primary group-hover:text-brand-green">
          {event.title}
        </h3>

        {!compact && (
          <>
            <MetaItem icon={<MapPin className="h-3.5 w-3.5" />} className="mt-1">
              {event.mode === "En ligne" ? "En ligne" : `${event.city} · ${event.timeLabel}`}
            </MetaItem>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone="navy">{event.mode}</Badge>
              <Badge tone={isFree(event.price) ? "green" : "mint"} icon={<Ticket className="h-3.5 w-3.5" />}>
                {isFree(event.price) ? "Gratuit" : event.price}
              </Badge>
              {lowSeats && (
                <Badge tone="warning" icon={<Users className="h-3.5 w-3.5" />}>
                  {event.seatsLeft} places
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

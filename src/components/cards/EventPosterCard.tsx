import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import type { HealthEvent } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { dateChip, formatFcfa } from "@/lib/format";
import { cardInteractive, CardMedia, OverlayBadge, MetaItem, CardCta } from "./primitives";

/** Free if no positive ticket price. */
function eventIsFree(event: HealthEvent): boolean {
  if (typeof event.priceAmount === "number") return event.priceAmount <= 0;
  return /gratuit|free|^0/i.test(event.price.trim());
}

function priceLabel(event: HealthEvent): string {
  if (eventIsFree(event)) return "Gratuit";
  if (typeof event.priceAmount === "number" && event.priceAmount > 0) return formatFcfa(event.priceAmount);
  return event.price;
}

/**
 * Eventbrite-style poster card: cover image, date chip, title, place, price.
 * Built on the shared card primitives so it matches the platform charter.
 */
export function EventPosterCard({ event }: { event: HealthEvent }) {
  const chip = dateChip(event.startAt);
  const free = eventIsFree(event);
  const lowSeats = event.seatsLeft > 0 && event.seatsLeft <= 20;
  const place = event.mode === "En ligne" ? "En ligne" : `${event.city}`;

  return (
    <Link to={`/evenements/${event.id}`} className={`${cardInteractive} flex flex-col overflow-hidden`}>
      <CardMedia
        src={event.cover}
        alt={event.title}
        height="lg"
        fallback={<CalendarDays className="h-8 w-8" />}
        overlayTopLeft={
          <OverlayBadge icon={<CalendarDays className="h-3.5 w-3.5 text-brand-green" />}>
            {chip.day} {chip.month}
          </OverlayBadge>
        }
        overlayTopRight={<OverlayBadge>{event.mode}</OverlayBadge>}
      />
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-bold text-text-primary group-hover:text-brand-green">
          {event.title}
        </h3>
        <MetaItem icon={<MapPin className="h-3.5 w-3.5" />} className="mt-1.5">
          {place}
          {event.timeLabel ? ` · ${event.timeLabel}` : ""}
        </MetaItem>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge tone={free ? "green" : "mint"} icon={<Ticket className="h-3.5 w-3.5" />}>
            {priceLabel(event)}
          </Badge>
          {lowSeats && (
            <Badge tone="warning" icon={<Users className="h-3.5 w-3.5" />}>
              {event.seatsLeft} places
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end pt-1">
          <CardCta>{free ? "Voir l'événement" : "Réserver"}</CardCta>
        </div>
      </div>
    </Link>
  );
}

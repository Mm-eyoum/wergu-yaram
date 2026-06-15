import { useParams } from "react-router-dom";
import { CalendarDays, Clock, MapPin, Ticket, UserRound, Users } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EventCard } from "@/components/cards/EventCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { communityBySlug, eventById } from "@/services/content";
import { formatDate } from "@/lib/format";

export default function EventDetail() {
  const { id } = useParams();
  const event = id ? eventById(id) : undefined;

  if (!event) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Événement introuvable" message="Cet événement n'existe pas ou a été retiré." />
      </div>
    );
  }

  const related = event.relatedEvents.map((e) => eventById(e)).filter(Boolean);
  const community = event.communitySlug ? communityBySlug(event.communitySlug) : undefined;

  return (
    <div className="container-page py-6">
      <Breadcrumb
        items={[
          { label: "Accueil", to: "/" },
          { label: "Événements", to: "/" },
          { label: event.title },
        ]}
      />

      <div className="mt-4 overflow-hidden rounded-3xl border border-border-soft bg-white shadow-soft">
        <div className="h-52 sm:h-64">
          <img src={event.cover} alt={event.title} className="h-full w-full object-cover" />
        </div>
        <div className="p-6">
          <Badge tone="green">{event.mode}</Badge>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{event.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">{event.summary}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-text-secondary">
            <Meta icon={<CalendarDays className="h-4 w-4" />} value={formatDate(event.startAt)} />
            <Meta icon={<Clock className="h-4 w-4" />} value={event.timeLabel} />
            <Meta icon={<MapPin className="h-4 w-4" />} value={`${event.location}, ${event.city}`} />
            <Meta icon={<Users className="h-4 w-4" />} value={event.organizer} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <SectionCard title="À propos de l'événement">
            <p className="text-sm leading-relaxed text-text-secondary">{event.about}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {event.audience.map((a) => (
                <Badge key={a} tone="mint">
                  {a}
                </Badge>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Programme">
            <ol className="space-y-3">
              {event.program.map((p) => (
                <li key={p.time} className="flex gap-3">
                  <span className="w-16 shrink-0 text-sm font-bold text-brand-green">{p.time}</span>
                  <span className="text-sm text-text-secondary">{p.title}</span>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard title="Intervenants">
            <div className="grid gap-3 sm:grid-cols-2">
              {event.speakers.map((s) => (
                <div key={s.name} className="flex items-center gap-3 rounded-2xl border border-border-soft p-3">
                  <Avatar name={s.name} size="md" />
                  <div>
                    <p className="text-sm font-bold text-text-primary">{s.name}</p>
                    <p className="text-xs text-text-secondary">{s.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Informations pratiques">
            <dl className="space-y-2 text-sm">
              {event.practicalInfo.map((info) => (
                <div key={info.label} className="flex justify-between gap-3 border-b border-border-soft pb-2 last:border-0">
                  <dt className="text-text-secondary">{info.label}</dt>
                  <dd className="text-right font-medium text-text-primary">{info.value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <div className="card-surface p-6 lg:sticky lg:top-20">
            <h2 className="text-lg font-bold text-text-primary">Inscription</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row icon={<Ticket className="h-4 w-4" />} label="Tarif" value={event.price} />
              <Row icon={<UserRound className="h-4 w-4" />} label="Places restantes" value={`${event.seatsLeft}`} />
            </dl>
            <Button fullWidth size="lg" className="mt-4">
              S'inscrire à l'événement
            </Button>
            <p className="mt-2 text-center text-xs text-text-secondary">Confirmation immédiate par email</p>
          </div>

          {related.length > 0 && (
            <SidebarPanel title="Événements similaires">
              <div className="space-y-3">
                {related.map((e) => e && <EventCard key={e.id} event={e} />)}
              </div>
            </SidebarPanel>
          )}

          {community && (
            <SidebarPanel title="Communauté associée">
              <CommunityCard community={community} />
            </SidebarPanel>
          )}
        </aside>
      </div>
    </div>
  );
}

function Meta({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-brand-green">{icon}</span>
      {value}
    </span>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="inline-flex items-center gap-2 text-text-secondary">
        <span className="text-brand-green">{icon}</span>
        {label}
      </dt>
      <dd className="font-semibold text-text-primary">{value}</dd>
    </div>
  );
}

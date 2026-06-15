import { useParams } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Star,
  Stethoscope,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EquipmentNeedCard } from "@/components/cards/EquipmentNeedCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { equipmentNeedById, facilityBySlug } from "@/services/content";

export default function FacilityDetail() {
  const { slug } = useParams();
  const facility = slug ? facilityBySlug(slug) : undefined;

  if (!facility) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Établissement introuvable" message="Cette fiche n'existe pas ou a été déplacée." />
      </div>
    );
  }

  const needs = facility.equipmentNeeds.map((id) => equipmentNeedById(id)).filter(Boolean);

  return (
    <div className="container-page py-6">
      <Breadcrumb
        items={[
          { label: "Accueil", to: "/" },
          { label: "Établissements", to: "/recherche?type=etablissement" },
          { label: facility.name },
        ]}
      />

      {/* Hero */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-border-soft bg-white shadow-soft">
        <div className="h-48 w-full sm:h-60">
          <img src={facility.cover} alt={facility.name} className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="navy">{facility.type}</Badge>
              {facility.verified && (
                <Badge tone="green" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
                  Référencé & vérifié
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{facility.name}</h1>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-secondary">
              <MapPin className="h-4 w-4" /> {facility.address}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-bold text-text-primary">{facility.rating.toFixed(1)}</span>
              <span className="text-text-secondary">({facility.reviewsCount} avis)</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button>
              <Phone className="h-4 w-4" /> Appeler
            </Button>
            <Button variant="outline">
              <MapPin className="h-4 w-4" /> Itinéraire
            </Button>
          </div>
        </div>
      </div>

      {/* Quick facts */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={<Stethoscope className="h-5 w-5" />} label="Spécialités" value={`${facility.specialties.length}`} />
        <Fact icon={<Building2 className="h-5 w-5" />} label="Capacité" value={facility.capacity} />
        <Fact icon={<Clock className="h-5 w-5" />} label="Horaires" value={facility.hours} />
        <Fact icon={<Mail className="h-5 w-5" />} label="Contact" value={facility.email} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <SectionCard title="À propos">
            <p className="text-sm leading-relaxed text-text-secondary">{facility.description}</p>
          </SectionCard>

          <SectionCard title="Spécialités">
            <div className="flex flex-wrap gap-2">
              {facility.specialties.map((s) => (
                <Badge key={s} tone="mint">
                  {s}
                </Badge>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Services disponibles">
            <ul className="grid gap-2 sm:grid-cols-2">
              {facility.services.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm text-text-secondary">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-brand-green" /> {s}
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Médecins & spécialistes">
            <div className="grid gap-3 sm:grid-cols-2">
              {facility.doctors.map((d) => (
                <div key={d.name} className="flex items-center gap-3 rounded-2xl border border-border-soft p-3">
                  <Avatar name={d.name} size="md" />
                  <div>
                    <p className="text-sm font-bold text-text-primary">{d.name}</p>
                    <p className="text-xs text-text-secondary">{d.specialty}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Avis & recommandations">
            <div className="space-y-3">
              {facility.reviews.map((r) => (
                <div key={r.author} className="rounded-2xl border border-border-soft p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-text-primary">{r.author}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {r.rating}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{r.comment}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Localisation">
            <div className="overflow-hidden rounded-2xl border border-border-soft">
              <iframe
                title={`Carte ${facility.name}`}
                className="h-48 w-full"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${facility.coords.lng - 0.02}%2C${facility.coords.lat - 0.02}%2C${facility.coords.lng + 0.02}%2C${facility.coords.lat + 0.02}&layer=mapnik&marker=${facility.coords.lat}%2C${facility.coords.lng}`}
              />
            </div>
            <p className="mt-2 text-sm text-text-secondary">{facility.address}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-secondary">
              <Phone className="h-4 w-4" /> {facility.phone}
            </p>
          </SectionCard>

          {needs.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold text-text-primary">Besoins d'équipement actifs</h2>
              <div className="space-y-4">
                {needs.map((n) => n && <EquipmentNeedCard key={n.id} need={n} />)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-surface flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-mint text-brand-green">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="truncate text-sm font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

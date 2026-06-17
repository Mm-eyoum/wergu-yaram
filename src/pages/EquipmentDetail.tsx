import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Hospital,
  MapPin,
  Users,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/ui/Card";
import { DonationWidget } from "@/components/equipment/DonationWidget";
import { EquipmentNeedCard } from "@/components/cards/EquipmentNeedCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { LazyMapView } from "@/components/map/LazyMapView";
import { DirectionsButton } from "@/components/map/DirectionsButton";
import { useEquipmentNeed, useEquipmentNeeds, useFacility } from "@/hooks/useCatalog";
import { formatDate, formatFcfa } from "@/lib/format";
import { SEOHead } from "@/seo/SEOHead";
import { equipmentNeedJsonLd, breadcrumbJsonLd } from "@/seo/jsonld";
import { ShareButtons } from "@/components/ShareButtons";
import { track } from "@/lib/analytics";

export default function EquipmentDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { data: need, isLoading } = useEquipmentNeed(id);
  const { data: allNeeds = [] } = useEquipmentNeeds();
  const { data: facility } = useFacility(need?.facilitySlug);

  // Bictorys redirects back with ?don=succes on a completed checkout — record the
  // conversion once (the donation itself is credited server-side by the webhook).
  const donationOutcome = searchParams.get("don");
  useEffect(() => {
    if (donationOutcome === "succes" && id) track("donation_succeeded", { needId: id });
  }, [donationOutcome, id]);

  if (isLoading) {
    return (
      <div className="container-page py-16">
        <LoadingState label="Chargement de la campagne…" />
      </div>
    );
  }

  if (!need) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Besoin introuvable" noIndex />
        <EmptyState title="Besoin introuvable" message="Cette campagne n'existe pas ou est terminée." />
      </div>
    );
  }

  const others = allNeeds.filter((n) => n.id !== need.id).slice(0, 2);
  const budgetTotal = need.budget.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="container-page py-6">
      <SEOHead
        title={need.title}
        description={need.shortDescription}
        ogType="website"
        ogImage={need.cover}
        jsonLd={[
          equipmentNeedJsonLd(need),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Besoins", path: "/besoins" },
            { name: need.title, path: `/besoins/${need.id}` },
          ]),
        ]}
      />
      <Breadcrumb
        items={[
          { label: "Accueil", to: "/" },
          { label: "Besoins", to: "/besoins" },
          { label: need.title },
        ]}
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Hero */}
          <div className="overflow-hidden rounded-3xl border border-border-soft bg-white shadow-soft">
            <div className="h-52 sm:h-64">
              <img src={need.cover} alt={need.title} className="h-full w-full object-cover" decoding="async" fetchPriority="high" />
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                {need.urgency === "urgent" && <Badge tone="danger">Urgent</Badge>}
                <Badge tone="mint">{need.category}</Badge>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{need.title}</h1>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-secondary">
                <Hospital className="h-4 w-4" /> {need.facilityName}
                <span className="mx-1">·</span>
                <MapPin className="h-4 w-4" /> {need.region}
              </p>
              <div className="mt-4 flex flex-wrap gap-5 text-sm text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-brand-green" /> {need.donorsCount} donateurs
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-brand-green" /> {need.daysLeft} jours restants
                </span>
              </div>
              <ShareButtons
                className="mt-4"
                url={`/besoins/${need.id}`}
                title={need.title}
                description={need.shortDescription}
                hashtags={["WerguYaram", "Solidarité"]}
              />
            </div>
          </div>

          <SectionCard title="À propos du projet">
            <p className="text-sm leading-relaxed text-text-secondary">{need.description}</p>
          </SectionCard>

          <SectionCard title="Impact attendu">
            <ul className="grid gap-2 sm:grid-cols-2">
              {need.impact.map((i) => (
                <li key={i} className="flex gap-2 text-sm text-text-secondary">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" /> {i}
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Répartition du budget">
            <ul className="space-y-2">
              {need.budget.map((b) => (
                <li key={b.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-text-secondary">{b.label}</span>
                  <span className="font-semibold text-text-primary">{formatFcfa(b.amount)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-border-soft pt-2 text-sm font-bold">
                <span>Total</span>
                <span className="text-brand-green">{formatFcfa(budgetTotal)}</span>
              </li>
            </ul>
          </SectionCard>

          {need.updates.length > 0 && (
            <SectionCard title="Mises à jour" icon={<CalendarClock className="h-5 w-5" />}>
              <ol className="space-y-4">
                {need.updates.map((u) => (
                  <li key={u.title} className="border-l-2 border-brand-green pl-4">
                    <p className="text-xs text-text-secondary">{formatDate(u.date)}</p>
                    <p className="font-semibold text-text-primary">{u.title}</p>
                    <p className="text-sm text-text-secondary">{u.text}</p>
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}

          {need.documents.length > 0 && (
            <SectionCard title="Documents & transparence" icon={<FileText className="h-5 w-5" />}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {need.documents.map((d) => (
                  <li
                    key={d.label}
                    className="flex items-center gap-3 rounded-2xl border border-border-soft p-3"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-mint text-brand-green">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{d.label}</p>
                      <p className="text-xs text-text-secondary">{d.type}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {need.gallery.length > 0 && (
            <SectionCard title="Photos">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {need.gallery.map((src) => (
                  <img key={src} src={src} alt="" className="h-28 w-full rounded-2xl object-cover" loading="lazy" />
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Donation widget + beneficiary */}
        <aside className="space-y-5">
          <div className="lg:sticky lg:top-20 lg:space-y-5">
            <DonationWidget need={need} />

            {facility && (
              <SectionCard title="Établissement bénéficiaire">
                <Link to={`/etablissements/${facility.slug}`} className="flex items-center gap-3 group">
                  <img src={facility.cover} alt="" className="h-14 w-14 rounded-2xl object-cover" loading="lazy" />
                  <div>
                    <p className="text-sm font-bold text-text-primary group-hover:text-brand-green">
                      {facility.name}
                    </p>
                    <p className="text-xs text-text-secondary">{facility.city}, {facility.region}</p>
                  </div>
                </Link>
                <div className="mt-3 overflow-hidden rounded-2xl">
                  <LazyMapView
                    className="h-40 w-full"
                    markers={[{ id: facility.slug, coords: facility.coords, title: facility.name }]}
                    zoom={14}
                  />
                </div>
                <div className="mt-3">
                  <DirectionsButton to={facility.coords} />
                </div>
              </SectionCard>
            )}
          </div>
        </aside>
      </div>

      {/* Other needs */}
      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">Autres besoins à soutenir</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((n) => (
              <EquipmentNeedCard key={n.id} need={n} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

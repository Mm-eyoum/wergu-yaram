import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarHeart,
  LocateFixed,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { EventPosterCard } from "@/components/cards/EventPosterCard";
import { EventCard } from "@/components/cards/EventCard";
import { EventSearchBar } from "@/components/events/EventSearchBar";
import { EventCategoryRow, EVENT_CATEGORIES } from "@/components/events/EventCategoryRow";
import { ButtonLink } from "@/components/ui/Button";
import { TrustStatsBar } from "@/components/ui/TrustStatsBar";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { useEvents } from "@/hooks/useCatalog";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineKm } from "@/lib/geo";
import { SENEGAL_REGIONS } from "@/lib/constants";
import type { HealthEvent } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

type Quick = "" | "week" | "weekend" | "online" | "free";

function isFree(e: HealthEvent): boolean {
  if (typeof e.priceAmount === "number") return e.priceAmount <= 0;
  return /gratuit|free|^0/i.test(e.price.trim());
}

const DAY = 24 * 60 * 60 * 1000;

/** Matches the active quick filter against an event. */
function matchesQuick(e: HealthEvent, quick: Quick): boolean {
  if (quick === "online") return e.mode === "En ligne" || e.mode === "Hybride";
  if (quick === "free") return isFree(e);
  const t = Date.parse(e.startAt);
  if (!Number.isFinite(t)) return quick === "";
  const now = Date.now();
  if (quick === "week") return t >= now && t <= now + 7 * DAY;
  if (quick === "weekend") {
    const d = new Date(t);
    const day = d.getDay(); // 0 Sun … 6 Sat
    return (day === 6 || day === 0) && t >= now && t <= now + 14 * DAY;
  }
  return true;
}

function matchesCategory(e: HealthEvent, cat: string): boolean {
  if (!cat) return true;
  if (cat === "webinaire") return e.mode === "En ligne" || /webinaire/i.test(e.category ?? "");
  return (e.category ?? "").toLowerCase().includes(cat);
}

const QUICK_FILTERS: { key: Quick; label: string }[] = [
  { key: "week", label: "Cette semaine" },
  { key: "weekend", label: "Ce week-end" },
  { key: "online", label: "En ligne" },
  { key: "free", label: "Gratuit" },
];

export default function Evenements() {
  const { data: events = [], isLoading, isError } = useEvents();
  const geo = useGeolocation();

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState(SENEGAL_REGIONS[0]);
  const [category, setCategory] = useState("");
  const [quick, setQuick] = useState<Quick>("");
  const [nearMe, setNearMe] = useState(false);

  const hasFilters = Boolean(query || category || quick || (region && region !== SENEGAL_REGIONS[0]) || nearMe);

  // Base filtered + sorted set (used by the "results" view and as the data pool).
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    let list = events.filter((e) => {
      if (region !== SENEGAL_REGIONS[0] && e.city !== region && !e.location?.includes(region)) return false;
      if (!matchesQuick(e, quick)) return false;
      if (!matchesCategory(e, category)) return false;
      if (term && !`${e.title} ${e.city} ${e.summary}`.toLowerCase().includes(term)) return false;
      return true;
    });
    if (nearMe && geo.position) {
      list = list
        .map((e) => ({ e, d: haversineKm(geo.position!, e.coords) }))
        .sort((a, b) => a.d - b.d)
        .map((x) => x.e);
    } else {
      list = [...list].sort((a, b) => (Date.parse(a.startAt) || 0) - (Date.parse(b.startAt) || 0));
    }
    return list;
  }, [events, query, region, category, quick, nearMe, geo.position]);

  // Curated sections (only when no active filtering — the discovery landing).
  const upcoming = useMemo(
    () =>
      [...events]
        .filter((e) => (Date.parse(e.startAt) || 0) >= Date.now() - DAY)
        .sort((a, b) => (Date.parse(a.startAt) || 0) - (Date.parse(b.startAt) || 0)),
    [events],
  );
  const featured = useMemo(() => {
    const flagged = upcoming.filter((e) => e.featured);
    return (flagged.length ? flagged : upcoming).slice(0, 3);
  }, [upcoming]);

  // Collections grouped by category label (falls back to mode).
  const collections = useMemo(() => {
    const groups = new Map<string, HealthEvent[]>();
    for (const e of upcoming) {
      const cat = EVENT_CATEGORIES.find((c) => matchesCategory(e, c.value));
      const key = cat?.label ?? e.mode;
      const arr = groups.get(key) ?? [];
      if (arr.length < 6) arr.push(e);
      groups.set(key, arr);
    }
    return [...groups.entries()].filter(([, v]) => v.length >= 2).slice(0, 3);
  }, [upcoming]);

  function handleNearMe() {
    if (!geo.position) geo.request();
    setNearMe((v) => !v);
  }

  return (
    <div>
      <SEOHead
        title="Événements santé"
        description="Ateliers, webinaires, dépistages et journées de sensibilisation santé au Sénégal — trouvez et réservez près de chez vous."
        canonicalPath="/evenements"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Événements", path: "/evenements" },
        ])}
      />

      {/* Hero + search */}
      <section className="bg-mint-fade">
        <div className="container-page py-12 text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            Événements <span className="text-brand-green">santé</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
            Ateliers, webinaires, dépistages et journées de sensibilisation — apprenez, rencontrez et
            prenez soin de votre santé, près de chez vous.
          </p>
          <div className="mt-6">
            <EventSearchBar query={query} region={region} onQuery={setQuery} onRegion={setRegion} />
          </div>
          {/* Quick filters */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setQuick((q) => (q === f.key ? "" : f.key))}
                className={cn(
                  "min-h-[40px] rounded-pill border px-4 text-sm font-semibold transition-colors",
                  quick === f.key
                    ? "border-brand-green bg-brand-green text-white"
                    : "border-border-soft bg-white text-text-secondary hover:border-brand-teal hover:text-brand-green",
                )}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleNearMe}
              className={cn(
                "inline-flex min-h-[40px] items-center gap-1.5 rounded-pill border px-4 text-sm font-semibold transition-colors",
                nearMe
                  ? "border-brand-green bg-brand-green text-white"
                  : "border-border-soft bg-white text-text-secondary hover:border-brand-teal hover:text-brand-green",
              )}
            >
              <LocateFixed className="h-4 w-4" /> Près de moi
            </button>
          </div>
        </div>
      </section>

      <div className="container-page space-y-12 py-12">
        {isLoading ? (
          <LoadingState label="Chargement des événements…" />
        ) : isError ? (
          <EmptyState
            title="Événements indisponibles"
            message="Une erreur est survenue lors du chargement. Réessayez plus tard."
          />
        ) : events.length === 0 ? (
          <EmptyState title="Aucun événement" message="Aucun événement n'est programmé pour le moment." />
        ) : hasFilters ? (
          /* --- Results view (filtered) --- */
          <section>
            <SectionHeading title={`${filtered.length} événement${filtered.length > 1 ? "s" : ""}`} />
            {filtered.length === 0 ? (
              <EmptyState title="Aucun résultat" message="Aucun événement ne correspond à ces critères." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((e) => (
                  <EventPosterCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* --- Discovery landing --- */
          <>
            {/* Browse by category */}
            <section>
              <h2 className="mb-4 text-lg font-bold text-text-primary">Parcourir par thème</h2>
              <EventCategoryRow active={category} onSelect={setCategory} />
            </section>

            {/* Featured */}
            {featured.length > 0 && (
              <section>
                <SectionHeading title="À la une" icon={<Sparkles className="h-5 w-5 text-brand-green" />} />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.map((e) => (
                    <EventPosterCard key={e.id} event={e} />
                  ))}
                </div>
              </section>
            )}

            {/* Near me */}
            {geo.position && (
              <section>
                <SectionHeading
                  title="Près de chez vous"
                  icon={<LocateFixed className="h-5 w-5 text-brand-green" />}
                />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[...upcoming]
                    .map((e) => ({ e, d: haversineKm(geo.position!, e.coords) }))
                    .sort((a, b) => a.d - b.d)
                    .slice(0, 3)
                    .map(({ e }) => (
                      <EventPosterCard key={e.id} event={e} />
                    ))}
                </div>
              </section>
            )}

            {/* Collections by theme */}
            {collections.map(([title, list]) => (
              <section key={title}>
                <SectionHeading title={title} />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.slice(0, 3).map((e) => (
                    <EventPosterCard key={e.id} event={e} />
                  ))}
                </div>
              </section>
            ))}

            {/* Upcoming calendar (compact) */}
            <section>
              <SectionHeading title="Prochainement" icon={<CalendarHeart className="h-5 w-5 text-brand-green" />} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.slice(0, 6).map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </section>
          </>
        )}

        {/* Organizer CTA */}
        <section className="rounded-3xl bg-mint-fade p-8 sm:p-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-green/10 px-3 py-1 text-sm font-semibold text-brand-green">
                <Megaphone className="h-4 w-4" /> Organisateurs
              </span>
              <h2 className="mt-3 text-2xl font-extrabold">Vous organisez un événement santé ?</h2>
              <p className="mt-1 text-text-secondary">
                Publiez vos ateliers et webinaires, touchez la communauté et gérez vos inscriptions.
                Réservé aux structures avec une page validée.
              </p>
            </div>
            <ButtonLink to="/dashboard/pages/new" size="lg">
              Créer ma page <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </section>

        {/* Trust stats */}
        <TrustStatsBar
          title="La santé se vit aussi en communauté"
          stats={[
            { value: String(events.length), label: "Événements", icon: <CalendarHeart className="h-5 w-5" /> },
            { value: String(new Set(events.map((e) => e.city)).size), label: "Villes couvertes", icon: <LocateFixed className="h-5 w-5" /> },
            { value: String(events.filter((e) => e.mode !== "Présentiel").length), label: "En ligne / hybride", icon: <Sparkles className="h-5 w-5" /> },
          ]}
        />
      </div>
    </div>
  );
}

function SectionHeading({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {icon}
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
    </div>
  );
}

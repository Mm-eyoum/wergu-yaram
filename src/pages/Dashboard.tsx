import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  Building2,
  CalendarDays,
  Heart,
  LayoutGrid,
  LifeBuoy,
  MapPin,
  Pill,
  Plus,
  Search,
  ShieldQuestion,
  Sparkles,
  Users,
} from "lucide-react";
import { ProfileSummaryCard } from "@/components/dashboard/ProfileSummaryCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useSupport } from "@/hooks/useSupport";
import {
  useFavorites,
  useMemberships,
  useReminders,
  useSavedSearches,
  useUserOrganizations,
  useUserFacilities,
  useUserSubscriptions,
} from "@/hooks/useDashboardData";
import { useFacilities } from "@/hooks/useCatalog";
import { fetchUserClaims } from "@/services/claims";
import { HEALTH_INTERESTS, ORG_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { OrgStatus } from "@/types/domain";

const STATUS_TONE: Record<OrgStatus, "green" | "warning" | "danger"> = {
  active: "green",
  pending: "warning",
  suspended: "danger",
};
const STATUS_TEXT: Record<OrgStatus, string> = {
  active: "Validée",
  pending: "En attente",
  suspended: "Suspendue",
};

/** Small async wrapper for a sidebar list: skeleton → error → empty → rows. */
function AsyncList<T>({
  query,
  emptyText,
  emptyCta,
  children,
}: {
  query: { data: T[] | undefined; isLoading: boolean; isError: boolean; refetch?: () => void };
  emptyText: string;
  emptyCta?: ReactNode;
  children: (data: T[]) => ReactNode;
}) {
  if (query.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-4/5" />
      </div>
    );
  }
  if (query.isError || query.data === undefined) {
    return (
      <div className="text-sm text-text-secondary">
        Impossible de charger ces données.{" "}
        {query.refetch && (
          <button onClick={() => query.refetch?.()} className="font-semibold text-brand-green hover:underline">
            Réessayer
          </button>
        )}
      </div>
    );
  }
  if (query.data.length === 0) {
    return (
      <div className="space-y-2 text-sm text-text-secondary">
        <p>{emptyText}</p>
        {emptyCta}
      </div>
    );
  }
  return <>{children(query.data)}</>;
}

function rowLink(to: string, icon: ReactNode, label: string) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-xl border border-border-soft px-3 py-2 text-sm text-text-secondary hover:border-brand-teal hover:text-brand-green"
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const openSupport = useSupport();
  const uid = user?.uid;
  const firstName = user?.displayName?.split(" ")[0] ?? "à vous";
  const interests = user?.interests?.length ? user.interests : HEALTH_INTERESTS.slice(0, 3);

  const savedSearches = useSavedSearches(uid);
  const favorites = useFavorites(uid);
  const memberships = useMemberships(uid);
  const reminders = useReminders(uid);
  const organizations = useUserOrganizations(uid);
  const myFacilities = useUserFacilities(uid);
  const subscriptions = useUserSubscriptions(uid);
  const activeSubs = (subscriptions.data ?? []).filter((s) => s.status === "active");
  const { data: facilities = [] } = useFacilities();
  const nearbyFacilities = facilities.slice(0, 4);
  const claims = useQuery({
    queryKey: ["userClaims", uid],
    queryFn: () => fetchUserClaims(uid!),
    enabled: !!uid,
  });

  const count = (q: { data?: unknown[]; isSuccess: boolean }) => (q.isSuccess ? q.data!.length : "—");

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Bonjour {firstName} 👋</h1>
        <p className="text-sm text-text-secondary">Voici un aperçu de votre espace santé.</p>
      </header>

      {/* Stats — real per-user counts */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Search className="h-5 w-5" />} value={count(savedSearches)} label="Recherches sauvegardées" />
        <StatCard icon={<Bookmark className="h-5 w-5" />} value={count(favorites)} label="Favoris" />
        <StatCard icon={<Users className="h-5 w-5" />} value={count(memberships)} label="Communautés rejointes" />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} value={count(reminders)} label="Rappels à venir" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left column */}
        <div className="space-y-5">
          {user && <ProfileSummaryCard user={user} />}

          <SidebarPanel title="Mes intérêts santé" icon={<Heart className="h-4 w-4" />}>
            <div className="flex flex-wrap gap-2">
              {interests.map((i) => (
                <Badge key={i} tone="mint">
                  {i}
                </Badge>
              ))}
            </div>
          </SidebarPanel>

          <div className="rounded-3xl bg-brand-gradient p-5 text-white">
            <LifeBuoy className="h-7 w-7" />
            <h3 className="mt-2 font-bold">Besoin d'aide ?</h3>
            <p className="mt-1 text-sm text-white/85">Notre équipe est là pour vous accompagner.</p>
            <button
              onClick={openSupport}
              className="mt-3 inline-flex rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-brand-green"
            >
              Contacter le support
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Mes pages — central to the page/organization model */}
          <SidebarPanel
            title="Mes pages"
            icon={<LayoutGrid className="h-4 w-4" />}
            className="md:col-span-2"
          >
            <AsyncList
              query={organizations}
              emptyText="Vous ne gérez aucune page pour l'instant. Créez une page pour votre structure, partenaire ou donateur — ou réclamez une structure de santé déjà référencée."
              emptyCta={
                <div className="flex flex-wrap gap-2">
                  <ButtonLink to="/dashboard/pages/new" size="sm" variant="outline">
                    <Plus className="h-4 w-4" /> Créer une page
                  </ButtonLink>
                  <ButtonLink to="/structures/revendiquer" size="sm" variant="outline">
                    <ShieldQuestion className="h-4 w-4" /> Réclamer une structure
                  </ButtonLink>
                </div>
              }
            >
              {(orgs) => (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {orgs.map((org) => (
                      <Link
                        key={org.id}
                        to={`/dashboard/pages/${org.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border-soft px-3 py-2.5 transition-colors hover:border-brand-teal"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-mint text-brand-green">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1 truncate text-sm font-semibold text-text-primary">
                            {org.name}
                            {org.planTier && (
                              <BadgeCheck className="h-4 w-4 shrink-0 text-brand-green" aria-label="Vérifié" />
                            )}
                          </p>
                          <p className="text-xs text-text-secondary">{ORG_TYPE_LABELS[org.type]}</p>
                        </div>
                        <Badge tone={STATUS_TONE[org.status]}>{STATUS_TEXT[org.status]}</Badge>
                      </Link>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink to="/dashboard/pages/new" size="sm" variant="outline">
                      <Plus className="h-4 w-4" /> Créer une page
                    </ButtonLink>
                    <ButtonLink to="/structures/revendiquer" size="sm" variant="outline">
                      <ShieldQuestion className="h-4 w-4" /> Réclamer une structure
                    </ButtonLink>
                  </div>
                </div>
              )}
            </AsyncList>
          </SidebarPanel>

          {activeSubs.length > 0 && (
            <SidebarPanel
              title="Mes abonnements"
              icon={<Sparkles className="h-4 w-4" />}
              className="md:col-span-2"
            >
              <div className="space-y-2">
                {activeSubs.map((sub) => (
                  <Link
                    key={sub.id}
                    to={sub.orgId ? `/dashboard/pages/${sub.orgId}` : "/dashboard"}
                    className="flex items-center gap-3 rounded-xl border border-border-soft px-3 py-2.5 transition-colors hover:border-brand-teal"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-green/10 text-brand-green">
                      <BadgeCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {sub.planId?.includes("pro") ? "Pro" : "Vérifié"}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Renouvellement avant le {formatDate(sub.currentPeriodEnd)}
                      </p>
                    </div>
                    <Badge tone="green">Actif</Badge>
                  </Link>
                ))}
              </div>
            </SidebarPanel>
          )}

          {(myFacilities.data?.length ?? 0) > 0 && (
            <SidebarPanel
              title="Mes établissements"
              icon={<Building2 className="h-4 w-4" />}
              className="md:col-span-2"
            >
              <ul className="space-y-2">
                {myFacilities.data!.map((f) => (
                  <li key={f.slug}>
                    <Link
                      to={`/dashboard/facilities/${f.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-border-soft px-3 py-2.5 transition-colors hover:border-brand-teal"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-mint text-brand-green">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{f.name}</p>
                        <p className="truncate text-xs text-text-secondary">{f.city || f.region}</p>
                      </div>
                      <Badge tone={f.published ? "green" : "warning"}>
                        {f.published ? "Publié" : "En attente"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </SidebarPanel>
          )}

          {(claims.data?.length ?? 0) > 0 && (
            <SidebarPanel
              title="Mes réclamations"
              icon={<ShieldQuestion className="h-4 w-4" />}
              className="md:col-span-2"
            >
              <ul className="space-y-2">
                {claims.data!.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border border-border-soft px-3 py-2.5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-mint text-brand-green">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <Link
                      to={`/structures/${c.orgId}`}
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary hover:text-brand-green"
                    >
                      {c.orgName}
                    </Link>
                    <Badge
                      tone={c.status === "approved" ? "green" : c.status === "rejected" ? "danger" : "warning"}
                    >
                      {c.status === "approved"
                        ? "Approuvée"
                        : c.status === "rejected"
                          ? "Rejetée"
                          : "En attente"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </SidebarPanel>
          )}

          <SidebarPanel title="Recherches sauvegardées" icon={<Search className="h-4 w-4" />} action={{ label: "Rechercher", to: "/recherche" }}>
            <AsyncList
              query={savedSearches}
              emptyText="Aucune recherche sauvegardée. Lancez une recherche et enregistrez-la pour la retrouver ici."
              emptyCta={<ButtonLink to="/recherche" size="sm" variant="outline">Explorer</ButtonLink>}
            >
              {(items) => (
                <ul className="space-y-2">
                  {items.map((s) => (
                    <li key={s.id}>
                      {rowLink(`/recherche?q=${encodeURIComponent(s.query)}`, <Search className="h-4 w-4 shrink-0" />, s.query)}
                    </li>
                  ))}
                </ul>
              )}
            </AsyncList>
          </SidebarPanel>

          <SidebarPanel title="Médicaments & articles enregistrés" icon={<Pill className="h-4 w-4" />} action={{ label: "Explorer", to: "/recherche?type=medicament" }}>
            <AsyncList
              query={favorites}
              emptyText="Aucun médicament ni article enregistré pour l'instant."
            >
              {(items) => {
                const saved = items.filter((f) => f.type === "medicament" || f.type === "article");
                return saved.length ? (
                  <ul className="space-y-2">
                    {saved.map((f) => (
                      <li key={f.id}>{rowLink(f.href, <Pill className="h-4 w-4 shrink-0" />, f.title)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-secondary">Aucun médicament ni article enregistré pour l'instant.</p>
                );
              }}
            </AsyncList>
          </SidebarPanel>

          <SidebarPanel title="Mes favoris" icon={<Bookmark className="h-4 w-4" />} action={{ label: "Explorer", to: "/recherche" }}>
            <AsyncList
              query={favorites}
              emptyText="Aucun favori. Ajoutez des établissements, pathologies ou communautés à vos favoris."
            >
              {(items) => {
                const others = items.filter((f) => f.type !== "medicament" && f.type !== "article");
                return others.length ? (
                  <ul className="space-y-2">
                    {others.map((f) => (
                      <li key={f.id}>{rowLink(f.href, <Heart className="h-4 w-4 shrink-0" />, f.title)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-secondary">Aucun autre favori pour l'instant.</p>
                );
              }}
            </AsyncList>
          </SidebarPanel>

          <SidebarPanel title="Établissements à proximité" icon={<MapPin className="h-4 w-4" />} action={{ label: "Carte", to: "/carte" }}>
            {nearbyFacilities.length ? (
              <ul className="space-y-2">
                {nearbyFacilities.map((f) => (
                  <li key={f.slug}>
                    <Link
                      to={`/etablissements/${f.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-border-soft px-3 py-2 transition-colors hover:border-brand-teal"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-mint text-brand-green">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{f.name}</p>
                        <p className="truncate text-xs text-text-secondary">{f.region}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">Aucun établissement à afficher.</p>
            )}
          </SidebarPanel>

          <SidebarPanel title="Communautés rejointes" icon={<Users className="h-4 w-4" />} action={{ label: "Découvrir", to: "/communautes" }}>
            <AsyncList
              query={memberships}
              emptyText="Vous n'avez rejoint aucune communauté."
              emptyCta={<ButtonLink to="/communautes" size="sm" variant="outline">Voir les communautés</ButtonLink>}
            >
              {(items) => (
                <ul className="space-y-2">
                  {items.map((m) => (
                    <li key={m.id}>{rowLink(`/communautes/${m.communitySlug}`, <Users className="h-4 w-4 shrink-0" />, m.name)}</li>
                  ))}
                </ul>
              )}
            </AsyncList>
          </SidebarPanel>

          <SidebarPanel title="Rappels & événements" icon={<CalendarDays className="h-4 w-4" />} action={{ label: "Événements", to: "/evenements" }}>
            <AsyncList
              query={reminders}
              emptyText="Aucun rappel programmé."
            >
              {(items) => (
                <ul className="space-y-2">
                  {items.map((r) =>
                    r.eventId ? (
                      <li key={r.id}>{rowLink(`/evenements/${r.eventId}`, <CalendarDays className="h-4 w-4 shrink-0" />, r.title)}</li>
                    ) : (
                      <li key={r.id} className="flex items-center gap-2 rounded-xl border border-border-soft px-3 py-2 text-sm text-text-secondary">
                        <CalendarDays className="h-4 w-4 shrink-0" />
                        <span className="truncate">{r.title}</span>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </AsyncList>
          </SidebarPanel>

          <SidebarPanel title="Messages" icon={<Bell className="h-4 w-4" />} action={{ label: "Ouvrir", to: "/messages" }} className="md:col-span-2">
            <div className="flex flex-col items-start gap-2 text-sm text-text-secondary">
              <p>Échangez en toute confidentialité avec l'équipe, les soignants et les communautés.</p>
              <ButtonLink to="/messages" size="sm" variant="outline">Ouvrir la messagerie</ButtonLink>
            </div>
          </SidebarPanel>
        </div>
      </div>
    </div>
  );
}

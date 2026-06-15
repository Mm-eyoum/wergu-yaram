import { Link } from "react-router-dom";
import {
  Bell,
  Bookmark,
  CalendarDays,
  Heart,
  Hospital,
  LifeBuoy,
  Pill,
  Search,
  Users,
} from "lucide-react";
import { ProfileSummaryCard } from "@/components/dashboard/ProfileSummaryCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { SidebarPanel } from "@/components/ui/SidebarPanel";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { MedicationCard } from "@/components/cards/MedicationCard";
import { FacilityCard } from "@/components/cards/FacilityCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { EventCard } from "@/components/cards/EventCard";
import { useAuth } from "@/hooks/useAuth";
import {
  communities,
  events,
  facilities,
  medications,
} from "@/services/content";
import { HEALTH_INTERESTS } from "@/lib/constants";

const SAVED_SEARCHES = ["Diabète de type 2", "Cardiologue Dakar", "Paracétamol posologie"];

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "à vous";
  const interests = user?.interests?.length ? user.interests : HEALTH_INTERESTS.slice(0, 3);

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Bonjour {firstName} 👋</h1>
        <p className="text-sm text-text-secondary">Voici un aperçu de votre espace santé.</p>
      </header>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Search className="h-5 w-5" />} value={SAVED_SEARCHES.length} label="Recherches sauvegardées" />
        <StatCard icon={<Bookmark className="h-5 w-5" />} value={8} label="Favoris" />
        <StatCard icon={<Users className="h-5 w-5" />} value={2} label="Communautés rejointes" />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} value={3} label="Rappels à venir" />
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

          <div className="card-surface bg-brand-navy p-5 text-white">
            <LifeBuoy className="h-7 w-7 text-brand-teal" />
            <h3 className="mt-2 font-bold">Besoin d'aide ?</h3>
            <p className="mt-1 text-sm text-white/80">Notre équipe est là pour vous accompagner.</p>
            <ButtonLink variant="primary" size="sm" className="mt-3" to="/messages">
              Contacter le support
            </ButtonLink>
          </div>
        </div>

        {/* Right column */}
        <div className="grid gap-6 md:grid-cols-2">
          <SidebarPanel title="Recherches sauvegardées" icon={<Search className="h-4 w-4" />} action={{ label: "Tout voir", to: "/recherche" }}>
            <ul className="space-y-2">
              {SAVED_SEARCHES.map((s) => (
                <li key={s}>
                  <Link
                    to={`/recherche?q=${encodeURIComponent(s)}`}
                    className="flex items-center gap-2 rounded-xl border border-border-soft px-3 py-2 text-sm text-text-secondary hover:border-brand-teal hover:text-brand-green"
                  >
                    <Search className="h-4 w-4" /> {s}
                  </Link>
                </li>
              ))}
            </ul>
          </SidebarPanel>

          <SidebarPanel title="Médicaments enregistrés" icon={<Pill className="h-4 w-4" />} action={{ label: "Tout voir", to: "/recherche?type=medicament" }}>
            <div className="space-y-2">
              {medications.slice(0, 2).map((m) => (
                <MedicationCard key={m.slug} medication={m} />
              ))}
            </div>
          </SidebarPanel>

          <SidebarPanel title="Établissements à proximité" icon={<Hospital className="h-4 w-4" />} action={{ label: "Tout voir", to: "/recherche?type=etablissement" }}>
            <div className="space-y-3">
              {facilities.slice(0, 2).map((f) => (
                <FacilityCard key={f.slug} facility={f} />
              ))}
            </div>
          </SidebarPanel>

          <SidebarPanel title="Communautés rejointes" icon={<Users className="h-4 w-4" />} action={{ label: "Tout voir", to: "/communautes" }}>
            <div className="space-y-3">
              {communities.slice(0, 2).map((c) => (
                <CommunityCard key={c.slug} community={c} />
              ))}
            </div>
          </SidebarPanel>

          <SidebarPanel title="Rappels & événements" icon={<CalendarDays className="h-4 w-4" />}>
            <div className="space-y-3">
              {events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </SidebarPanel>

          <SidebarPanel title="Messages & notifications" icon={<Bell className="h-4 w-4" />} action={{ label: "Messages", to: "/messages" }}>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                <span className="text-text-secondary">
                  <span className="font-semibold text-text-primary">Dr Fatou Diop</span> vous a envoyé un message.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                <span className="text-text-secondary">Nouvel événement dans la Communauté Diabète.</span>
              </li>
            </ul>
          </SidebarPanel>
        </div>
      </div>
    </div>
  );
}

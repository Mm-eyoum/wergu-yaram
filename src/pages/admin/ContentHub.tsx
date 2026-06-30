import { Link } from "react-router-dom";
import {
  Pill, Stethoscope, Newspaper, Building2, Users, HeartHandshake, Calendar, Handshake, FileText, MapPin, ArrowRight, GraduationCap, Globe, Scale, Quote,
  type LucideIcon,
} from "lucide-react";
import { CONTENT_ENTRIES } from "@/admin/content/entries";
import { PermissionGate } from "@/components/admin/PermissionGate";
import { SEOHead } from "@/seo/SEOHead";

const ICONS: Record<string, LucideIcon> = {
  pill: Pill,
  stethoscope: Stethoscope,
  newspaper: Newspaper,
  building2: Building2,
  users: Users,
  heartHandshake: HeartHandshake,
  calendar: Calendar,
  handshake: Handshake,
  "graduation-cap": GraduationCap,
  globe: Globe,
  scale: Scale,
  quote: Quote,
};

interface HubCard {
  key: string;
  label: string;
  sublabel?: string;
  icon: string;
  to: string;
}

/**
 * One card per content type, except entries sharing a `group` collapse into a
 * single card (e.g. "Partenaires" → fiches + espaces) linking to the first of
 * the group. Order follows CONTENT_ENTRIES; a group lands at its first member.
 */
function buildHubCards(): HubCard[] {
  const seenGroups = new Set<string>();
  const cards: HubCard[] = [];
  for (const entry of CONTENT_ENTRIES) {
    if (entry.group) {
      if (seenGroups.has(entry.group)) continue;
      seenGroups.add(entry.group);
      const members = CONTENT_ENTRIES.filter((e) => e.group === entry.group);
      cards.push({
        key: `group:${entry.group}`,
        label: entry.group,
        sublabel: members.map((e) => e.label).join(" · "),
        icon: members[0].icon,
        to: `/admin/content/${members[0].key}`,
      });
    } else {
      cards.push({ key: entry.key, label: entry.label, icon: entry.icon, to: `/admin/content/${entry.key}` });
    }
  }
  return cards;
}

export default function ContentHub() {
  return (
    <div className="mx-auto max-w-5xl">
      <SEOHead title="Contenus" noIndex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Contenus</h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          Gérez le contenu éditorial publié sur la plateforme.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {buildHubCards().map((card) => {
          const Icon = ICONS[card.icon] ?? FileText;
          return (
            <Link
              key={card.key}
              to={card.to}
              className="card-surface group flex items-center gap-3 p-4 transition hover:shadow-card dark:bg-white/5"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green dark:bg-white/10">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text-primary dark:text-white">{card.label}</span>
                {card.sublabel && (
                  <span className="block text-xs text-text-secondary dark:text-white/50">{card.sublabel}</span>
                )}
              </span>
              <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" />
            </Link>
          );
        })}

        {/* Directory listings live in the `organizations` collection (imported from
            Google Places), not the editorial CMS — link to their dedicated manager.
            Gated on `moderation` since that's what /admin/directory requires. */}
        <PermissionGate permission="moderation">
          <Link
            to="/admin/directory"
            className="card-surface group flex items-center gap-3 p-4 transition hover:shadow-card dark:bg-white/5"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green dark:bg-white/10">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-text-primary dark:text-white">
                Annuaire — structures importées
              </span>
              <span className="block text-xs text-text-secondary dark:text-white/50">
                Établissements importés depuis Google Places
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" />
          </Link>
        </PermissionGate>
      </div>
    </div>
  );
}

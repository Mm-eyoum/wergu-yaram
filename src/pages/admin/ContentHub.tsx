import { Link } from "react-router-dom";
import {
  Pill, Stethoscope, Newspaper, Building2, Users, HeartHandshake, Calendar, Handshake, FileText, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { CONTENT_ENTRIES } from "@/admin/content/entries";
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
};

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
        {CONTENT_ENTRIES.map((entry) => {
          const Icon = ICONS[entry.icon] ?? FileText;
          return (
            <Link
              key={entry.key}
              to={`/admin/content/${entry.key}`}
              className="card-surface group flex items-center gap-3 p-4 transition hover:shadow-card dark:bg-white/5"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green dark:bg-white/10">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 font-semibold text-text-primary dark:text-white">{entry.label}</span>
              <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

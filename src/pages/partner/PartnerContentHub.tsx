import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PARTNER_ENTRIES } from "@/admin/content/partnerEntries";
import { SEOHead } from "@/seo/SEOHead";

/** Partner content hub — entry points to each manageable content type. */
export default function PartnerContentHub() {
  const { slug } = useParams();
  const base = `/espace/${slug}/gestion/contenus`;
  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Contenus de l'espace" noIndex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Contenus</h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          Créez et gérez le contenu de votre espace. Publication immédiate.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PARTNER_ENTRIES.map((entry) => (
          <Link
            key={entry.key}
            to={`${base}/${entry.key}`}
            className="card-surface group flex items-center gap-3 p-4 transition hover:shadow-card dark:bg-white/5"
          >
            <span className="min-w-0 flex-1 font-semibold text-text-primary dark:text-white">{entry.label}</span>
            <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

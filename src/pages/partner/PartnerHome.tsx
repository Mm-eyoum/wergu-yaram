import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchTenantForManager } from "@/services/tenants";
import { PARTNER_NAV } from "@/components/partner/partnerNav";
import { SEOHead } from "@/seo/SEOHead";

/**
 * Partner dashboard home. The real analytics tiles are wired in Phase 3
 * (useTenantAnalytics) — for now a welcome + quick navigation.
 */
export default function PartnerHome() {
  const { slug } = useParams();
  const base = `/espace/${slug}/gestion`;
  const { data: tenant } = useQuery({
    queryKey: ["partner", "tenant", slug],
    queryFn: () => fetchTenantForManager(slug!),
    enabled: !!slug,
  });
  const accent = { color: "var(--tenant-accent, #007A5E)" };

  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Tableau de bord partenaire" noIndex />
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Espace partenaire</p>
        <h1 className="text-2xl font-extrabold sm:text-3xl" style={accent}>{tenant?.name ?? slug}</h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-white/60">
          Gérez votre sous-plateforme : contenus, campagnes et paramètres.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {PARTNER_NAV.filter((n) => n.key !== "home").map((item) => (
          <Link
            key={item.key}
            to={item.segment ? `${base}/${item.segment}` : base}
            className="card-surface group flex items-center gap-3 p-4 transition hover:shadow-card dark:bg-white/5"
          >
            <item.icon className="h-5 w-5" style={accent} />
            <span className="min-w-0 flex-1 font-semibold text-text-primary dark:text-white">{item.label}</span>
            <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

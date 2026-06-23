import { EmptyState } from "@/components/ui/EmptyState";
import { SEOHead } from "@/seo/SEOHead";

/** Self-service tenant campaigns — wired in Phase 5 (sendCampaign tenant scope + quota). */
export default function PartnerCampaigns() {
  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Campagnes de l'espace" noIndex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Campagnes</h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          Campagnes SMS / WhatsApp ciblées sur vos communautés.
        </p>
      </header>
      <EmptyState title="Bientôt disponible" message="L'envoi self-service de campagnes arrive prochainement." />
    </div>
  );
}

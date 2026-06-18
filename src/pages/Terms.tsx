import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SEOHead } from "@/seo/SEOHead";
import { useLegalConfig } from "@/hooks/useSiteConfig";
import { DEFAULT_LEGAL } from "@/services/siteConfig";

export default function Terms() {
  const { data: legal = DEFAULT_LEGAL } = useLegalConfig();
  const sections = legal.sections;
  return (
    <div className="container-page py-8">
      <SEOHead
        title="Conditions d'utilisation & confidentialité"
        description="Conditions d'utilisation et politique de confidentialité de Wergu Yaram, le portail santé du Sénégal."
      />
      <Breadcrumb
        items={[
          { label: "Accueil", to: "/" },
          { label: "Conditions d'utilisation" },
        ]}
      />

      <div className="mx-auto mt-4 max-w-3xl">
        <h1 className="text-3xl font-extrabold">Conditions d'utilisation &amp; confidentialité</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Dernière mise à jour : {legal.lastUpdated}. En utilisant Wergu Yaram, vous acceptez les
          conditions ci-dessous.
        </p>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="card-surface p-6">
              <h2 className="text-lg font-bold text-text-primary">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 rounded-2xl bg-brand-mint p-4 text-sm text-text-secondary">
          Information éducative — ne remplace pas un avis médical professionnel.
        </p>
      </div>
    </div>
  );
}

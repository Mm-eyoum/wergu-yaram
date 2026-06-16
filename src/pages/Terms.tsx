import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SEOHead } from "@/seo/SEOHead";

const SECTIONS = [
  {
    title: "1. Objet",
    body: "Wergu Yaram est un portail d'information santé au Sénégal. Il met à disposition des contenus éducatifs (pathologies, médicaments, articles), un annuaire d'établissements, des communautés d'entraide et un espace de soutien aux besoins d'équipement. L'utilisation de la plateforme implique l'acceptation des présentes conditions.",
  },
  {
    title: "2. Information éducative, non médicale",
    body: "Les contenus publiés ont une vocation informative et éducative. Ils ne remplacent en aucun cas une consultation, un diagnostic ou un avis médical professionnel. En cas de symptôme ou de doute sur votre santé, consultez un professionnel de santé qualifié.",
  },
  {
    title: "3. Compte utilisateur",
    body: "La création d'un compte requiert des informations exactes. Vous êtes responsable de la confidentialité de vos identifiants. Les comptes de structures de santé, partenaires et donateurs peuvent faire l'objet d'une validation avant l'accès à certaines fonctionnalités.",
  },
  {
    title: "4. Données personnelles & confidentialité",
    body: "Nous collectons uniquement les données nécessaires au fonctionnement du service (identité, email, région, centres d'intérêt). Vos données ne sont jamais revendues. Vous disposez d'un droit d'accès, de rectification et de suppression de vos données en nous contactant.",
  },
  {
    title: "5. Communautés & contenus partagés",
    body: "Les espaces communautaires et le forum doivent rester bienveillants et respectueux. Aucun diagnostic médical n'y est délivré. Tout contenu illégal, diffamatoire ou portant atteinte à la vie privée d'autrui pourra être retiré.",
  },
  {
    title: "6. Soutien aux besoins d'équipement",
    body: "Les campagnes de soutien visent à financer des équipements pour des structures de santé. La transparence sur l'utilisation des fonds est un engagement de la plateforme. Les modalités de paiement et de reçu sont précisées au moment de la contribution.",
  },
  {
    title: "7. Contact",
    body: "Pour toute question relative à ces conditions ou à vos données, vous pouvez nous écrire via les coordonnées indiquées en pied de page.",
  },
];

export default function Terms() {
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
          Dernière mise à jour : juin 2026. En utilisant Wergu Yaram, vous acceptez les conditions
          ci-dessous.
        </p>

        <div className="mt-8 space-y-6">
          {SECTIONS.map((section) => (
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

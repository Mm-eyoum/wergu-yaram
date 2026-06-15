import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Explorer",
    links: [
      { label: "Pathologies", to: "/recherche?type=pathologie" },
      { label: "Médicaments", to: "/recherche?type=medicament" },
      { label: "Articles & vidéos", to: "/recherche?type=article" },
      { label: "Établissements", to: "/recherche?type=etablissement" },
    ],
  },
  {
    title: "Communauté",
    links: [
      { label: "Communautés santé", to: "/communautes" },
      { label: "Forum santé", to: "/forum" },
      { label: "Événements", to: "/evenements/atelier-diabete" },
      { label: "Messagerie", to: "/messages" },
    ],
  },
  {
    title: "Agir",
    links: [
      { label: "Besoins d'équipement", to: "/besoins" },
      { label: "Faire un don", to: "/besoins" },
      { label: "Partenaires", to: "/partenaires" },
      { label: "Devenir partenaire", to: "/partenaires" },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-border-soft bg-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-text-secondary">
            Le portail santé du Sénégal centré sur la recherche : comprendre, s'orienter,
            échanger et agir, simplement et en confiance.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-bold text-text-primary">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm link-muted">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border-soft">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-4 text-xs text-text-secondary sm:flex-row">
          <p>© {new Date().getFullYear()} Wergu Yaram. Tous droits réservés.</p>
          <p>
            Information éducative — ne remplace pas un avis médical professionnel.
          </p>
        </div>
      </div>
    </footer>
  );
}

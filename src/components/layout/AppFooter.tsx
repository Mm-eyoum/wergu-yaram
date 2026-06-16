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
      { label: "Événements", to: "/recherche?type=evenement" },
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
        <div className="container-page flex flex-col items-center gap-2 py-4 text-center text-xs text-text-secondary sm:flex-row sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Wergu Yaram · Information éducative — ne remplace pas un avis médical professionnel.</p>
          <Link to="/conditions" className="link-muted whitespace-nowrap">
            Conditions d'utilisation
          </Link>
        </div>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, Linkedin, Twitter, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NewsletterSignup } from "@/components/engagement/NewsletterSignup";
import { useMenuConfig, useSiteSettings } from "@/hooks/useSiteConfig";

const SOCIAL_ICONS: { key: keyof SocialMap; label: string; Icon: LucideIcon }[] = [
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "twitter", label: "X / Twitter", Icon: Twitter },
];
type SocialMap = { facebook: string; instagram: string; youtube: string; linkedin: string; twitter: string };

export function AppFooter() {
  const { data: menus } = useMenuConfig();
  const { data: settings } = useSiteSettings();
  const groups = menus?.footerGroups ?? [];
  const social = settings?.social;

  return (
    <footer className="mt-16 border-t border-border-soft bg-white">
      <div className="border-b border-border-soft bg-mint-fade">
        <div className="container-page flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <h3 className="text-base font-bold text-text-primary">Restez informé·e</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Conseils santé vérifiés, nouveaux contenus et campagnes à soutenir — une fois par mois, sans spam.
            </p>
          </div>
          <NewsletterSignup source="footer" className="w-full md:max-w-sm" />
        </div>
      </div>
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-text-secondary">{settings?.description}</p>
          {social && (
            <div className="mt-4 flex gap-2">
              {SOCIAL_ICONS.filter(({ key }) => social[key]).map(({ key, label, Icon }) => (
                <a
                  key={key}
                  href={social[key]}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-text-secondary transition-colors hover:bg-brand-mint hover:text-brand-green"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        {groups.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-bold text-text-primary">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link to={link.href} className="text-sm link-muted">
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
          <p>
            © {new Date().getFullYear()} {settings?.siteName ?? "Wergu Yaram"} · Information éducative — ne remplace pas un avis médical professionnel.
          </p>
          <Link to="/conditions" className="link-muted whitespace-nowrap">
            Conditions d'utilisation
          </Link>
        </div>
      </div>
    </footer>
  );
}

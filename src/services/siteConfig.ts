/**
 * Site configuration — global settings and editable navigation menus.
 *
 * Both live in the Firestore `settings` collection (`settings/site` and
 * `settings/navigation`). Reads merge the stored document over bundled
 * defaults, so the public header/footer always render — even before anything
 * is configured, or when Firebase is absent.
 */
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { reportError } from "@/lib/errorReporting";
import { PRIMARY_NAV } from "@/lib/constants";

export interface NavLink {
  label: string;
  href: string;
}

export interface FooterGroup {
  title: string;
  links: NavLink[];
}

export interface MenuConfig {
  header: NavLink[];
  footerGroups: FooterGroup[];
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  social: {
    facebook: string;
    instagram: string;
    youtube: string;
    linkedin: string;
    twitter: string;
  };
  features: {
    donations: boolean;
    forum: boolean;
    messaging: boolean;
    events: boolean;
  };
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Wergu Yaram",
  tagline: "Le portail santé du Sénégal",
  description:
    "Le portail santé du Sénégal centré sur la recherche : comprendre, s'orienter, échanger et agir, simplement et en confiance.",
  contactEmail: "",
  contactPhone: "",
  address: "",
  social: { facebook: "", instagram: "", youtube: "", linkedin: "", twitter: "" },
  features: { donations: true, forum: true, messaging: true, events: true },
};

export const DEFAULT_MENUS: MenuConfig = {
  header: PRIMARY_NAV.map((n) => ({ label: n.label, href: n.to })),
  footerGroups: [
    {
      title: "Explorer",
      links: [
        { label: "Pathologies", href: "/recherche?type=pathologie" },
        { label: "Médicaments", href: "/recherche?type=medicament" },
        { label: "Articles & vidéos", href: "/recherche?type=article" },
        { label: "Établissements", href: "/recherche?type=etablissement" },
      ],
    },
    {
      title: "Communauté",
      links: [
        { label: "Communautés santé", href: "/communautes" },
        { label: "Forum santé", href: "/forum" },
        { label: "Événements", href: "/recherche?type=evenement" },
        { label: "Messagerie", href: "/messages" },
      ],
    },
    {
      title: "Agir",
      links: [
        { label: "Besoins d'équipement", href: "/besoins" },
        { label: "Faire un don", href: "/besoins" },
        { label: "Partenaires", href: "/partenaires" },
        { label: "Devenir partenaire", href: "/partenaires" },
      ],
    },
  ],
};

async function readDoc<T>(id: string, fallback: T): Promise<T> {
  if (!db) return fallback;
  try {
    const snap = await getDoc(doc(db, "settings", id));
    if (!snap.exists()) return fallback;
    // Shallow-merge over defaults so newly-added keys are never undefined.
    return { ...fallback, ...(snap.data() as Partial<T>) };
  } catch (err) {
    reportError(err, { scope: "siteConfig.readDoc", id });
    return fallback;
  }
}

export const getSiteSettings = () => readDoc<SiteSettings>("site", DEFAULT_SETTINGS);
export const getMenuConfig = () => readDoc<MenuConfig>("navigation", DEFAULT_MENUS);

// ---------------------------------------------------------------------------
// Appearance — logo, accent colour and a site-wide announcement banner.
// ---------------------------------------------------------------------------
export interface AppearanceConfig {
  logoUrl: string;
  accentColor: string;
  banner: { enabled: boolean; message: string; href: string };
}

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  logoUrl: "/logo.png",
  accentColor: "#007A5E",
  banner: { enabled: false, message: "", href: "" },
};

export const getAppearance = () => readDoc<AppearanceConfig>("appearance", DEFAULT_APPEARANCE);

// ---------------------------------------------------------------------------
// Redirects — client-side path → path rules (SEO-friendly URL changes).
// ---------------------------------------------------------------------------
export interface RedirectRule {
  from: string;
  to: string;
}

export interface RedirectConfig {
  rules: RedirectRule[];
}

export const DEFAULT_REDIRECTS: RedirectConfig = { rules: [] };

export const getRedirects = () => readDoc<RedirectConfig>("redirects", DEFAULT_REDIRECTS);

// ---------------------------------------------------------------------------
// Email templates — managed here; delivery is performed by a Cloud Function
// that reads these templates (sending is not wired client-side).
// ---------------------------------------------------------------------------
export interface EmailTemplate {
  key: string;
  name: string;
  subject: string;
  body: string;
}

export interface EmailConfig {
  templates: EmailTemplate[];
}

export const DEFAULT_EMAILS: EmailConfig = {
  templates: [
    {
      key: "welcome",
      name: "Bienvenue",
      subject: "Bienvenue sur Wergu Yaram",
      body: "Bonjour {{name}},\n\nMerci d'avoir rejoint Wergu Yaram, le portail santé du Sénégal.",
    },
    {
      key: "page_approved",
      name: "Page validée",
      subject: "Votre page a été validée",
      body: "Bonjour {{name}},\n\nVotre page « {{pageName}} » est désormais visible sur la plateforme.",
    },
  ],
};

export const getEmailConfig = () => readDoc<EmailConfig>("emails", DEFAULT_EMAILS);

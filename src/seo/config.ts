/**
 * Global SEO / social-sharing defaults for Wergu Yaram.
 *
 * Per-page values are passed to <SEOHead/>; these are the fallbacks and the
 * brand-level constants reused by the JSON-LD generators, the build-time OG
 * image templates and the sitemap script.
 */

export const SITE_NAME = "Wergu Yaram";

/** Tagline used as the homepage description / generic fallback. */
export const SITE_DESCRIPTION =
  "Portail santé du Sénégal centré sur la recherche : médicaments, pathologies, établissements, communautés et besoins d'équipement.";

/** Default share image (1200×630) used when a page has no dedicated visual. */
export const DEFAULT_OG_IMAGE = "/og/default.png";

export const LOCALE = "fr_FR";
export const LANG = "fr";

/** Brand color (Tailwind token `brand-green`) — drives theme-color & OG templates. */
export const BRAND_COLOR = "#00A878";
export const BRAND_GRADIENT = "linear-gradient(135deg, #00B894 0%, #00A878 100%)";

/** Logo served from /public. */
export const LOGO_PATH = "/logo.png";

/** Editorial signature shown across verified medical content. */
export const EDITORIAL_SOURCE = "Comité éditorial Wergu Yaram";

/** Social handles / profiles — used in the Organization JSON-LD `sameAs`. */
export const TWITTER_SITE = "@werguyaram";
export const SOCIAL_PROFILES: string[] = [
  "https://facebook.com/werguyaram",
  "https://twitter.com/werguyaram",
  "https://www.linkedin.com/company/werguyaram",
];

export const CONTACT_EMAIL = "contact@werguyaram.sn";

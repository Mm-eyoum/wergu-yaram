/**
 * Socle i18n (react-i18next).
 *
 * - Langues : FR (source de vérité), EN (best-effort), WO (Wolof, en cours de
 *   traduction → `fallbackLng: 'fr'` garantit qu'aucune chaîne n'est vide).
 * - Détection : préférence stockée (localStorage) → langue du navigateur.
 *   Au login, la préférence du profil utilisateur prend le relais (AuthContext).
 * - Les ressources sont chargées par glob : déposer un fichier
 *   `src/i18n/locales/<lng>/<namespace>.json` l'enregistre automatiquement.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const SUPPORTED_LANGS = ["fr", "en", "wo"] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<AppLang, string> = {
  fr: "Français",
  en: "English",
  wo: "Wolof",
};

/** Locale BCP-47 pour Intl (Wolof retombe sur fr-SN, peu supporté par Intl). */
const INTL_LOCALE: Record<AppLang, string> = {
  fr: "fr-FR",
  en: "en-GB",
  wo: "fr-SN",
};

// Auto-enregistrement des ressources : ./locales/<lng>/<ns>.json
const modules = import.meta.glob("./locales/*/*.json", { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, mod] of Object.entries(modules)) {
  const match = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
  if (!match) continue;
  const [, lng, ns] = match;
  (resources[lng] ??= {})[ns] = mod.default;
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    fallbackLng: "fr",
    defaultNS: "common",
    // Les clés Wolof non encore traduites sont des chaînes vides ("__TODO__") →
    // on retombe sur le FR au lieu d'afficher du vide.
    returnEmptyString: false,
    // Ressources bundlées (synchrones) → pas de Suspense nécessaire.
    react: { useSuspense: false },
    interpolation: { escapeValue: false }, // React échappe déjà
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "wy_lang",
      caches: ["localStorage"],
    },
  });

/** Locale BCP-47 active, pour Intl (dates, nombres, FCFA). */
export function currentIntlLocale(): string {
  const lng = (i18n.resolvedLanguage ?? "fr") as AppLang;
  return INTL_LOCALE[lng] ?? "fr-FR";
}

/** Change la langue active et la persiste. */
export function setAppLang(lng: AppLang): void {
  void i18n.changeLanguage(lng);
}

export default i18n;

import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateUserLanguage } from "@/services/users";
import { SUPPORTED_LANGS, LANG_LABELS, type AppLang } from "@/i18n";

/**
 * Sélecteur de langue (FR / EN / Wolof). Change la langue active (i18next persiste
 * dans localStorage) et, si l'utilisateur est connecté, enregistre la préférence
 * sur son profil pour qu'elle le suive sur ses autres appareils.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const current = (i18n.resolvedLanguage ?? "fr") as AppLang;

  async function onChange(lng: AppLang) {
    await i18n.changeLanguage(lng);
    if (user) {
      // Best-effort : ne bloque pas l'UI si l'écriture profil échoue.
      void updateUserLanguage(user.uid, lng).catch(() => {});
    }
  }

  return (
    <label className={className}>
      <span className="sr-only">{t("language.label")}</span>
      <div className="relative">
        <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <select
          value={current}
          onChange={(e) => void onChange(e.target.value as AppLang)}
          aria-label={t("language.label")}
          className="h-10 cursor-pointer rounded-xl border border-border-soft bg-white pl-8 pr-7 text-sm font-medium text-text-primary transition-colors hover:border-brand-teal focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
        >
          {SUPPORTED_LANGS.map((lng) => (
            <option key={lng} value={lng}>
              {LANG_LABELS[lng]}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

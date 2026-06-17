import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_APPEARANCE,
  DEFAULT_EMAILS,
  DEFAULT_MENUS,
  DEFAULT_REDIRECTS,
  DEFAULT_SETTINGS,
  getAppearance,
  getEmailConfig,
  getMenuConfig,
  getRedirects,
  getSiteSettings,
} from "@/services/siteConfig";

export const siteConfigKeys = {
  settings: ["siteConfig", "settings"] as const,
  menus: ["siteConfig", "menus"] as const,
  appearance: ["siteConfig", "appearance"] as const,
  redirects: ["siteConfig", "redirects"] as const,
  emails: ["siteConfig", "emails"] as const,
};

// Long stale time: config rarely changes and is read on every page (header/footer).
const STALE = 5 * 60 * 1000;

/** Global site settings, with bundled defaults as placeholder (never blank). */
export const useSiteSettings = () =>
  useQuery({
    queryKey: siteConfigKeys.settings,
    queryFn: getSiteSettings,
    placeholderData: DEFAULT_SETTINGS,
    staleTime: STALE,
  });

/** Editable navigation menus, with bundled defaults as placeholder. */
export const useMenuConfig = () =>
  useQuery({
    queryKey: siteConfigKeys.menus,
    queryFn: getMenuConfig,
    placeholderData: DEFAULT_MENUS,
    staleTime: STALE,
  });

/** Branding (logo, accent, announcement banner). */
export const useAppearance = () =>
  useQuery({
    queryKey: siteConfigKeys.appearance,
    queryFn: getAppearance,
    placeholderData: DEFAULT_APPEARANCE,
    staleTime: STALE,
  });

/** Client-side redirect rules. */
export const useRedirects = () =>
  useQuery({
    queryKey: siteConfigKeys.redirects,
    queryFn: getRedirects,
    placeholderData: DEFAULT_REDIRECTS,
    staleTime: STALE,
  });

/** Email templates (managed in admin; delivered by a Cloud Function). */
export const useEmailConfig = () =>
  useQuery({
    queryKey: siteConfigKeys.emails,
    queryFn: getEmailConfig,
    placeholderData: DEFAULT_EMAILS,
    staleTime: STALE,
  });

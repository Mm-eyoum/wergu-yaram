/** Admin writes for site settings, menus, appearance, redirects, emails. */
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { logAudit } from "@/services/audit";
import type {
  AppearanceConfig,
  EmailConfig,
  MenuConfig,
  RedirectConfig,
  SiteSettings,
} from "@/services/siteConfig";

/** Persist a settings document and record it in the audit trail. */
async function writeSettings(docId: string, data: object, title: string): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await setDoc(doc(db, "settings", docId), { ...data, updatedAt: serverTimestamp() });
  void logAudit({ action: "update", resourceType: "settings", resourceId: docId, resourceTitle: title });
}

export const updateSiteSettings = (next: SiteSettings) => writeSettings("site", next, "Paramètres du site");
export const updateMenuConfig = (next: MenuConfig) => writeSettings("navigation", next, "Navigation");
export const updateAppearance = (next: AppearanceConfig) => writeSettings("appearance", next, "Apparence");
export const updateRedirects = (next: RedirectConfig) => writeSettings("redirects", next, "Redirections");
export const updateEmailConfig = (next: EmailConfig) => writeSettings("emails", next, "Modèles d'email");

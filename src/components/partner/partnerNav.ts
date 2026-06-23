import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, FileStack, Megaphone, Settings } from "lucide-react";

export interface PartnerNavItem {
  key: string;
  label: string;
  /** Path relative to /espace/:slug/gestion (e.g. "" for index, "contenus"). */
  segment: string;
  icon: LucideIcon;
}

export const PARTNER_NAV: PartnerNavItem[] = [
  { key: "home", label: "Tableau de bord", segment: "", icon: LayoutDashboard },
  { key: "content", label: "Contenus", segment: "contenus", icon: FileStack },
  { key: "campaigns", label: "Campagnes", segment: "campagnes", icon: Megaphone },
  { key: "settings", label: "Paramètres", segment: "parametres", icon: Settings },
];

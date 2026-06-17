import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Image,
  ShieldCheck,
  Building2,
  Users,
  Menu as MenuIcon,
  Settings,
  Palette,
  ScrollText,
  CornerUpRight,
  Mail,
  MessageSquare,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export interface AdminNavItem {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Required permission to see this item (UI gate only). */
  permission: Permission;
  /** Whether the destination route is implemented yet. */
  ready: boolean;
}

/**
 * The admin information architecture. Items are filtered by permission and
 * rendered ready/coming-soon by the sidebar. Routes are wired incrementally
 * across the phased CMS build; `ready: false` items show a "Bientôt" hint.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  { key: "dashboard", label: "Tableau de bord", to: "/admin", icon: LayoutDashboard, permission: "content.read", ready: true },
  { key: "content", label: "Contenus", to: "/admin/content", icon: FileText, permission: "content.edit", ready: true },
  { key: "media", label: "Médiathèque", to: "/admin/media", icon: Image, permission: "media.manage", ready: true },
  { key: "moderation", label: "Modération des pages", to: "/admin/moderation", icon: ShieldCheck, permission: "moderation", ready: true },
  { key: "directory", label: "Annuaire (import)", to: "/admin/directory", icon: Building2, permission: "moderation", ready: true },
  { key: "comments", label: "Contributions", to: "/admin/comments", icon: MessageSquare, permission: "comments.moderate", ready: true },
  { key: "users", label: "Utilisateurs", to: "/admin/users", icon: Users, permission: "users.manage", ready: true },
  { key: "menus", label: "Menus", to: "/admin/menus", icon: MenuIcon, permission: "menus.manage", ready: true },
  { key: "redirects", label: "Redirections", to: "/admin/redirects", icon: CornerUpRight, permission: "redirects.manage", ready: true },
  { key: "emails", label: "Emails", to: "/admin/emails", icon: Mail, permission: "emails.manage", ready: true },
  { key: "appearance", label: "Apparence", to: "/admin/appearance", icon: Palette, permission: "appearance.manage", ready: true },
  { key: "settings", label: "Paramètres", to: "/admin/settings", icon: Settings, permission: "settings.update", ready: true },
  { key: "audit", label: "Journal d'audit", to: "/admin/audit-log", icon: ScrollText, permission: "audit.read", ready: true },
];

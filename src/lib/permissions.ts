/**
 * Front-side permission model for the admin CMS.
 *
 * This mirrors (and must stay in sync with) the authority granted by
 * `firestore.rules`. It only decides what the UI *shows* — the real gate is
 * server-side in the rules. Never rely on this for security.
 */
import type { Role } from "@/types/domain";

/** Every action the admin UI gates on. `resource.action` naming. */
export type Permission =
  | "content.read"
  | "content.edit"
  | "content.delete"
  | "content.publish"
  | "media.manage"
  | "moderation"
  | "comments.moderate"
  | "menus.manage"
  | "users.manage"
  | "roles.manage"
  | "settings.update"
  | "appearance.manage"
  | "redirects.manage"
  | "emails.manage"
  | "audit.read"
  | "revenue.read"
  | "campaigns.manage"
  | "backups.manage";

const EDITOR: Role[] = ["editor", "admin", "super_admin"];
const ADMIN: Role[] = ["admin", "super_admin"];
const SUPER: Role[] = ["super_admin"];

/** Which roles satisfy each permission. */
const PERMISSION_ROLES: Record<Permission, Role[]> = {
  "content.read": EDITOR,
  "content.edit": EDITOR,
  "content.delete": ADMIN,
  "content.publish": EDITOR,
  "media.manage": EDITOR,
  "moderation": ADMIN,
  "comments.moderate": EDITOR,
  "menus.manage": ADMIN,
  "users.manage": ADMIN,
  "roles.manage": ADMIN,
  "settings.update": ADMIN,
  "appearance.manage": ADMIN,
  "redirects.manage": ADMIN,
  "emails.manage": ADMIN,
  "audit.read": ADMIN,
  "revenue.read": ADMIN,
  "campaigns.manage": ADMIN,
  "backups.manage": SUPER,
};

/** True if `role` is allowed to perform `permission`. */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSION_ROLES[permission].includes(role);
}

/** True if the role may reach the admin area at all (any admin-side permission). */
export function canAccessAdmin(role: Role | null | undefined): boolean {
  return can(role, "content.read");
}

/**
 * Roles that `actorRole` may assign through the admin UI (never super_admin).
 * Mirrors `roleChangeAuthorized` in firestore.rules — keep both in sync:
 * super_admins manage the `admin` role; admins only toggle patient ↔ editor.
 */
export function assignableRoles(actorRole: Role | null | undefined): Role[] {
  // `health_pro` is a patient-level badge (no admin/editor power) — admins may grant it.
  if (actorRole === "super_admin") return ["patient_public", "health_pro", "editor", "admin"];
  if (actorRole === "admin") return ["patient_public", "health_pro", "editor"];
  return [];
}

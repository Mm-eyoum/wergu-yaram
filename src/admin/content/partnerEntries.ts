/**
 * Content types a partner may manage from their own space. A subset of the
 * global CMS registry (CONTENT_ENTRIES) — partners never touch global editorial
 * content (medications, pathologies, facilities, partners, tenants). Each entry
 * reuses the same schema/columns/resource; the partner pages build a
 * tenant-SCOPED ContentAdmin from `entry.admin.resource`.
 */
import { CONTENT_ENTRIES } from "./entries";
import type { AnyContentEntry } from "./registry";

/** Order shown in the partner content hub. */
export const PARTNER_ENTRY_KEYS = [
  "communities",
  "events",
  "articles",
  "formations",
  "equipmentNeeds",
] as const;

export const PARTNER_ENTRIES: AnyContentEntry[] = PARTNER_ENTRY_KEYS.map(
  (key) => CONTENT_ENTRIES.find((e) => e.key === key)!,
).filter(Boolean);

export function getPartnerEntry(key: string | undefined): AnyContentEntry | undefined {
  if (!key || !(PARTNER_ENTRY_KEYS as readonly string[]).includes(key)) return undefined;
  return CONTENT_ENTRIES.find((e) => e.key === key);
}

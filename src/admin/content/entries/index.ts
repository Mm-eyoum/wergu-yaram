/**
 * Content registry — one file per editorial type (see ./<type>.tsx). Each entry
 * is authored against its real domain interface (type-safe columns + blank
 * record) and declares a form schema consumed by the generic SchemaForm editor.
 * This barrel assembles them into the ordered lookup table the admin CMS uses.
 */
import type { AnyContentEntry } from "../registry";
import { medicationsEntry } from "./medications";
import { pathologiesEntry } from "./pathologies";
import { articlesEntry } from "./articles";
import { facilitiesEntry } from "./facilities";
import { communitiesEntry } from "./communities";
import { equipmentNeedsEntry } from "./equipmentNeeds";
import { eventsEntry } from "./events";
import { partnersEntry } from "./partners";
import { formationsEntry } from "./formations";
import { tenantsEntry } from "./tenants";
import { committeesEntry } from "./committees";

export const CONTENT_ENTRIES = [
  medicationsEntry,
  pathologiesEntry,
  articlesEntry,
  facilitiesEntry,
  communitiesEntry,
  equipmentNeedsEntry,
  eventsEntry,
  partnersEntry,
  formationsEntry,
  tenantsEntry,
  committeesEntry,
] as unknown as AnyContentEntry[];

export function getContentEntry(key: string | undefined): AnyContentEntry | undefined {
  return CONTENT_ENTRIES.find((e) => e.key === key);
}

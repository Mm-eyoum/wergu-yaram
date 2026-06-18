/**
 * Platform stats — real, computed counts for the "trust" strips.
 *
 * Uses Firestore aggregation (`getCountFromServer`) so we never ship invented
 * numbers. A count is `null` when Firebase is absent or the query fails; the UI
 * then omits that card rather than showing a placeholder. Vanity figures that
 * cannot be counted (total verified info, funds mobilised) are NOT here — they
 * live in editable `settings/site.stats` (see SiteSettings).
 */
import { collection, getCountFromServer, query, where, type Query } from "firebase/firestore";
import { db } from "./firebase";
import { reportError } from "@/lib/errorReporting";

export interface PlatformStats {
  /** Active healthcare-facility pages (validated directory listings). */
  facilities: number | null;
  /** Registered member accounts. */
  members: number | null;
  /** Active partner / donor pages. */
  partners: number | null;
  /** Published equipment fundraising needs. */
  equipmentNeeds: number | null;
}

const EMPTY: PlatformStats = { facilities: null, members: null, partners: null, equipmentNeeds: null };

async function safeCount(q: Query): Promise<number | null> {
  try {
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err) {
    reportError(err, { scope: "stats.safeCount" });
    return null;
  }
}

/** Sum of two optional counts (null only when both are null). */
function sum(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

export async function getPlatformStats(): Promise<PlatformStats> {
  if (!db) return EMPTY;
  const orgs = collection(db, "organizations");
  const active = (type: string) =>
    query(orgs, where("type", "==", type), where("status", "==", "active"));

  const [facilities, members, partner, partnerDonor, equipmentNeeds] = await Promise.all([
    safeCount(active("healthcare_facility")),
    safeCount(query(collection(db, "users"))),
    safeCount(active("partner")),
    safeCount(active("partner_donor")),
    safeCount(query(collection(db, "equipmentNeeds"))),
  ]);

  return { facilities, members, partners: sum(partner, partnerDonor), equipmentNeeds };
}

/** Locale-aware grouping ("15 000"); returns null so callers can omit the card. */
export function formatCount(value: number | null): string | null {
  if (value === null) return null;
  return new Intl.NumberFormat("fr-FR").format(value);
}

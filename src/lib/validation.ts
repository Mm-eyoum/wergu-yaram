/**
 * Lightweight input bounds for user-generated content.
 *
 * These mirror the limits enforced server-side in `firestore.rules` (function
 * `isText`). The rules are the real protection; these client-side checks give
 * users an immediate, readable error instead of an opaque permission-denied,
 * and keep the two limits in sync in one place. Zero dependencies on purpose.
 */

/** Character bounds, kept identical to firestore.rules `isText(...)` calls. */
export const TEXT_LIMITS = {
  displayName: { min: 0, max: 120 },
  organizationName: { min: 2, max: 150 },
  postContent: { min: 1, max: 5000 },
  threadTitle: { min: 1, max: 200 },
  threadExcerpt: { min: 1, max: 5000 },
  claimJustification: { min: 1, max: 2000 },
  verificationJustification: { min: 1, max: 5000 },
  messageText: { min: 1, max: 5000 },
} as const;

export type TextField = keyof typeof TEXT_LIMITS;

/**
 * Validate a string against a named bound. Returns the trimmed value, or throws
 * an `Error` with a French message suitable for surfacing in form UI.
 */
export function validateText(field: TextField, value: string, label: string): string {
  const { min, max } = TEXT_LIMITS[field];
  const trimmed = value.trim();
  if (trimmed.length < min || (min > 0 && trimmed.length === 0)) {
    throw new Error(`${label} est requis (au moins ${Math.max(min, 1)} caractère(s)).`);
  }
  if (trimmed.length > max) {
    throw new Error(`${label} ne doit pas dépasser ${max} caractères.`);
  }
  return trimmed;
}

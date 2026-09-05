/**
 * Harnais de test des politiques — équivalent pur de `@firebase/rules-unit-testing`.
 *
 * Correspondances avec firestore.rules.test.ts :
 *   testEnv.authenticatedContext(uid) + seedProfile(uid, role) → actor(uid, role)
 *   testEnv.unauthenticatedContext()                           → anon()
 *   assertSucceeds(...) / assertFails(...)                     → expect(can(...)).toBe(true/false)
 *   updateDoc(ref, patch)   → merge(prev, patch) puis évaluation sur le doc FUSIONNÉ
 *
 * Pas d'émulateur, pas de JDK, pas de réseau : la suite entière tourne en
 * millisecondes, ce qui permet d'en faire la porte d'entrée de chaque bascule.
 */
import type { Ctx, Doc, Policy, Role, Rule, UserStatus } from "../src/policy/types";

export function actor(
  uid: string,
  role: Role = "patient_public",
  status: UserStatus = "active",
  managedTenants: string[] = [],
): Ctx {
  return { actor: { uid, role, status }, managedTenants: new Set(managedTenants) };
}

export function anon(): Ctx {
  return { actor: null, managedTenants: new Set() };
}

/**
 * Reproduit la sémantique de `updateDoc` : le client n'envoie qu'un patch, mais
 * les règles évaluent `request.resource.data`, c'est-à-dire le document RÉSULTANT.
 * Évaluer le patch brut ferait passer tout champ absent pour supprimé.
 */
export function merge(prev: Doc, patch: Doc): Doc {
  return { ...prev, ...patch };
}

export function can(rule: Rule | undefined, ctx: Ctx, prev: Doc | null, next: Doc | null): boolean {
  if (!rule) return false; // règle absente = refus, jamais autorisation implicite
  return rule(ctx, prev, next).allow;
}

/** Raison du refus, pour les messages d'échec lisibles. */
export function why(rule: Rule | undefined, ctx: Ctx, prev: Doc | null, next: Doc | null): string {
  if (!rule) return "aucune règle définie";
  const d = rule(ctx, prev, next);
  return d.allow ? "autorisé" : d.reason;
}

export type { Ctx, Doc, Policy };

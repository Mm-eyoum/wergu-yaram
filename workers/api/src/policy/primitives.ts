/**
 * Primitives d'autorisation — le portage direct des helpers de firestore.rules.
 *
 * Correspondances (firestore.rules ligne → primitive) :
 *   isSignedIn      L7   → isSignedIn
 *   isOwner         L10  → isOwnerOf(field)
 *   isSuperAdmin    L20  → isSuperAdmin
 *   isAdmin         L24  → isAdmin
 *   isEditor        L31  → isEditor
 *   isActiveUser    L35  → isActiveUser
 *   isText          L40  → text(field, min, max)
 *   isTenantManager L55  → tenantManaged(...)   (résolu en amont, cf. types.ts)
 *   roleChangeAuthorized L78 → roleTransition
 *
 * ⚠️ CONVENTION IMPÉRATIVE POUR LES MISES À JOUR
 * `next` doit toujours être le document FUSIONNÉ (précédent + patch), jamais le
 * patch seul. Le client fait des `updateDoc` partiels ; évaluer le patch brut
 * ferait passer tout champ non transmis pour supprimé, et `frozen()` refuserait
 * alors des écritures légitimes — ou pire, laisserait passer un contournement.
 * La fusion est faite par le routeur, avant l'appel.
 */
import { ALLOW, deny, type Ctx, type Decision, type Doc, type Rule } from "./types";

// --- Combinateurs ---

/** Autorise si AU MOINS une règle autorise. Reprend le `||` des règles. */
export function any(...rules: Rule[]): Rule {
  return (ctx, prev, next) => {
    const reasons: string[] = [];
    for (const rule of rules) {
      const d = rule(ctx, prev, next);
      if (d.allow) return ALLOW;
      reasons.push(d.reason);
    }
    return deny(reasons.join(" ; "));
  };
}

/** Autorise si TOUTES les règles autorisent. Reprend le `&&` des règles. */
export function all(...rules: Rule[]): Rule {
  return (ctx, prev, next) => {
    for (const rule of rules) {
      const d = rule(ctx, prev, next);
      if (!d.allow) return d;
    }
    return ALLOW;
  };
}

export const never: Rule = () => deny("écriture réservée au serveur");
export const always: Rule = () => ALLOW;

// --- Identité et rôles ---

export const isSignedIn: Rule = (ctx) =>
  ctx.actor ? ALLOW : deny("authentification requise");

export const isActiveUser: Rule = (ctx) =>
  ctx.actor?.status === "active" ? ALLOW : deny("compte inactif ou suspendu");

export const isSuperAdmin: Rule = (ctx) =>
  ctx.actor?.role === "super_admin" ? ALLOW : deny("réservé au super_admin");

export const isAdmin: Rule = (ctx) =>
  ctx.actor && (ctx.actor.role === "admin" || ctx.actor.role === "super_admin")
    ? ALLOW
    : deny("réservé aux administrateurs");

export const isEditor: Rule = (ctx) =>
  ctx.actor &&
  (ctx.actor.role === "editor" || ctx.actor.role === "admin" || ctx.actor.role === "super_admin")
    ? ALLOW
    : deny("réservé au staff éditorial");

/**
 * Propriété par champ. En modification on regarde le propriétaire EXISTANT
 * (`resource.data`), en création celui qui est soumis (`request.resource.data`) —
 * exactement la distinction que font les règles.
 */
export function isOwnerOf(field: string): Rule {
  return (ctx, prev, next) => {
    if (!ctx.actor) return deny("authentification requise");
    const doc = prev ?? next;
    if (!doc) return deny("document introuvable");
    return doc[field] === ctx.actor.uid ? ALLOW : deny(`non propriétaire (${field})`);
  };
}

// --- Tenants ---

/**
 * Gestionnaire du tenant porté par le document.
 *
 * Reprend le garde `slug.size() > 0` des règles : un `tenantSlug` vide ou absent
 * ne correspond JAMAIS. C'est ce qui garantit que le contenu éditorial global
 * (sans tenantSlug) reste réservé aux éditeurs.
 */
export function tenantManagerOf(source: "prev" | "next" = "prev"): Rule {
  return (ctx, prev, next) => {
    const doc = source === "prev" ? prev : next;
    const slug = doc?.tenantSlug;
    if (typeof slug !== "string" || slug.length === 0) return deny("document hors espace partenaire");
    return ctx.managedTenants.has(slug) ? ALLOW : deny(`espace « ${slug} » non géré`);
  };
}

/** `tenantCreateOk()` — le doc doit viser un espace géré ET être possédé par l'appelant. */
export const tenantCreateOk: Rule = all(
  isSignedIn,
  tenantManagerOf("next"),
  (ctx, _prev, next) =>
    next?.ownerUid === ctx.actor?.uid ? ALLOW : deny("ownerUid doit être l'appelant"),
);

/** `tenantUpdateOk()` — espace géré, et tenantSlug/ownerUid immuables. */
export const tenantUpdateOk: Rule = all(
  isSignedIn,
  tenantManagerOf("prev"),
  frozen(["tenantSlug", "ownerUid"]),
);

/** `tenantDeleteOk()`. */
export const tenantDeleteOk: Rule = all(isSignedIn, tenantManagerOf("prev"));

// --- Validation de forme ---

/** `isText(value, min, max)` : chaîne présente, longueur bornée. */
export function text(field: string, min: number, max: number): Rule {
  return (_ctx, _prev, next) => {
    const v = next?.[field];
    if (typeof v !== "string") return deny(`« ${field} » doit être une chaîne`);
    if (v.length < min || v.length > max) {
      return deny(`« ${field} » doit faire entre ${min} et ${max} caractères`);
    }
    return ALLOW;
  };
}

/** Appartenance à une énumération. */
export function oneOf(field: string, values: readonly string[]): Rule {
  return (_ctx, _prev, next) => {
    const v = next?.[field];
    return typeof v === "string" && values.includes(v)
      ? ALLOW
      : deny(`« ${field} » doit valoir l'une de : ${values.join(", ")}`);
  };
}

/** Valeur imposée sur un champ (ex. `status == 'pending'` à la création). */
export function equals(field: string, value: unknown): Rule {
  return (_ctx, _prev, next) =>
    next?.[field] === value ? ALLOW : deny(`« ${field} » doit valoir ${JSON.stringify(value)}`);
}

/** Nombre présent et borné (ex. monthlyAmount ∈ [500, 5 000 000]). */
export function numberBetween(field: string, min: number, max: number): Rule {
  return (_ctx, _prev, next) => {
    const v = next?.[field];
    if (typeof v !== "number" || !Number.isFinite(v)) return deny(`« ${field} » doit être un nombre`);
    if (v < min || v > max) return deny(`« ${field} » doit être entre ${min} et ${max}`);
    return ALLOW;
  };
}

// --- Champs gelés ---

/** Égalité structurelle tolérant l'absence (les règles utilisent `.get(f, défaut)`). */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || a === null) return b === undefined || b === null;
  if (b === undefined || b === null) return false;
  if (typeof a === "object" || typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Interdit toute modification des champs listés.
 *
 * C'est le motif le plus répété des règles (facilities, organizations, tenants,
 * equipmentNeeds) et le plus facile à casser : chaque champ est testé
 * individuellement par la suite de tests.
 */
export function frozen(fields: readonly string[]): Rule {
  return (_ctx, prev, next) => {
    if (!prev || !next) return ALLOW; // rien à comparer (création/suppression)
    for (const f of fields) {
      if (!sameValue(prev[f], next[f])) return deny(`champ « ${f} » non modifiable`);
    }
    return ALLOW;
  };
}

// --- Transition de rôle ---

const ADMIN_TOGGLEABLE: readonly string[] = ["patient_public", "health_pro", "editor"];

/**
 * Portage de `roleChangeAuthorized` (firestore.rules L77-91).
 *
 * Invariants : on ne change jamais son PROPRE rôle ; un super_admin ne peut être
 * ni créé ni rétrogradé par cette voie ; un admin ne fait que basculer entre
 * patient_public, health_pro et editor (pas d'élévation de privilège).
 */
export function roleTransition(targetUidField = "uid"): Rule {
  return (ctx, prev, next) => {
    if (!ctx.actor) return deny("authentification requise");
    const oldRole = (prev?.role ?? "patient_public") as string;
    const newRole = (next?.role ?? oldRole) as string;
    const targetUid = (prev?.[targetUidField] ?? next?.[targetUidField]) as string | undefined;

    const isActorAdmin = ctx.actor.role === "admin" || ctx.actor.role === "super_admin";
    const isActorSuper = ctx.actor.role === "super_admin";

    // Pas de changement de rôle : un admin peut éditer les autres champs (statut…).
    if (oldRole === newRole) {
      return isActorAdmin ? ALLOW : deny("réservé aux administrateurs");
    }
    // Changement de rôle : jamais sur son propre compte.
    if (targetUid === ctx.actor.uid) return deny("changement de son propre rôle interdit");

    if (isActorSuper && oldRole !== "super_admin" && newRole !== "super_admin") return ALLOW;
    if (isActorAdmin && ADMIN_TOGGLEABLE.includes(oldRole) && ADMIN_TOGGLEABLE.includes(newRole)) {
      return ALLOW;
    }
    return deny(`transition de rôle « ${oldRole} » → « ${newRole} » non autorisée`);
  };
}

/** Sucre : exécute une règle et renvoie un booléen (confort de test). */
export function allows(rule: Rule, ctx: Ctx, prev: Doc | null, next: Doc | null): boolean {
  return rule(ctx, prev, next).allow;
}

export type { Ctx, Decision, Doc, Rule };

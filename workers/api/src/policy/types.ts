/**
 * Types du moteur d'autorisation.
 *
 * Ce module remplace les 503 lignes de `firestore.rules`. Il est volontairement
 * PUR : aucune I/O, aucun accès base, aucun réseau. Les faits qui exigeaient une
 * lecture côté Firestore (`get(users/$(uid))`, `get(tenants/$(slug))`) sont
 * résolus en amont par le routeur et passés dans le contexte.
 *
 * Cette pureté n'est pas de l'esthétique : c'est ce qui permet de rejouer les 43
 * assertions de firestore.rules.test.ts en millisecondes, sans émulateur et sans
 * JDK — et donc d'en faire la porte d'entrée obligatoire de chaque bascule.
 */

export type Role = "patient_public" | "health_pro" | "editor" | "admin" | "super_admin";
export type UserStatus = "pending" | "active" | "suspended";

/** L'appelant, tel que résolu après vérification du jeton Firebase. */
export interface Actor {
  uid: string;
  role: Role;
  status: UserStatus;
}

/** Un document, vu par la politique : un sac de champs comparable. */
export type Doc = Record<string, unknown>;

/**
 * Contexte d'évaluation. `managedTenants` porte le résultat de
 * `isTenantManager()` pour TOUS les slugs pertinents à la requête — résolu par
 * une requête indexée avant l'appel, jamais pendant.
 */
export interface Ctx {
  /** `null` = visiteur anonyme (request.auth == null). */
  actor: Actor | null;
  managedTenants: ReadonlySet<string>;
}

export type Decision = { allow: true } | { allow: false; reason: string };

export const ALLOW: Decision = { allow: true };
export const deny = (reason: string): Decision => ({ allow: false, reason });

/**
 * Une règle : décide à partir du contexte, de l'état précédent et de l'état
 * demandé. `prev` est absent en création, `next` en lecture/suppression.
 */
export type Rule = (ctx: Ctx, prev: Doc | null, next: Doc | null) => Decision;

/**
 * Prédicat SQL que la couche `list` doit AJOUTER à la requête.
 *
 * ⚠️ C'est la différence sémantique la plus dangereuse de toute la migration.
 * Les règles Firestore sont évaluées par document : une requête trop large est
 * REJETÉE. Une API SQL, elle, ne peut pas rejeter — elle doit FILTRER. Une
 * politique `list` oubliée n'est donc pas une erreur visible, c'est une fuite
 * silencieuse. D'où : `list` obligatoire, et refus par défaut.
 */
export type ListScope =
  | { kind: "deny" }
  | { kind: "all" }
  | { kind: "sql"; where: string; params: unknown[] };

export interface Policy {
  /** Lecture d'un document précis. */
  read?: Rule;
  /** OBLIGATOIRE. Cadrage des listes. Absent ⇒ refus (cf. `assertPolicyComplete`). */
  list: (ctx: Ctx) => ListScope;
  create?: Rule;
  update?: Rule;
  delete?: Rule;
}

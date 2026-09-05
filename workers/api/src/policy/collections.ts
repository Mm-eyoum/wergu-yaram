/**
 * Politiques par collection — portage de firestore.rules, bloc par bloc.
 *
 * Chaque entrée cite la ligne d'origine dans firestore.rules pour que la
 * relecture soit une comparaison, pas une réinterprétation.
 */
import {
  all,
  always,
  any,
  equals,
  frozen,
  isActiveUser,
  isAdmin,
  isEditor,
  isOwnerOf,
  isSignedIn,
  isSuperAdmin,
  never,
  oneOf,
  roleTransition,
  tenantCreateOk,
  tenantDeleteOk,
  tenantUpdateOk,
  text,
} from "./primitives";
import { ALLOW, deny, type Ctx, type ListScope, type Policy, type Rule } from "./types";

/**
 * `request.resource.data.get('champ', false) == false`.
 * Distinct de `frozen` : la valeur RÉSULTANTE doit être fausse, pas simplement
 * inchangée — c'est ce qui empêche un propriétaire de publier son établissement.
 */
function absentOrFalse(field: string): Rule {
  return (_ctx, _prev, next) => {
    const v = next?.[field];
    return v === undefined || v === null || v === false
      ? ALLOW
      : deny(`« ${field} » doit rester faux`);
  };
}

/** Le document doit porter le même id que la clé de route (facilities.slug). */
function idMatchesField(field: string): (id: string) => Rule {
  return (id) => (_ctx, _prev, next) =>
    next?.[field] === id ? ALLOW : deny(`« ${field} » doit être « ${id} »`);
}
export const slugMatches = idMatchesField("slug");

const listAll = (): ListScope => ({ kind: "all" });
const listDeny = (): ListScope => ({ kind: "deny" });

// =============================================================
// users — firestore.rules L97-119
// =============================================================
export const usersPolicy: Policy = {
  read: any(isOwnerOf("uid"), isAdmin),

  // La liste n'est PAS publique : chacun ne voit que lui-même, l'admin voit tout.
  list: (ctx: Ctx): ListScope => {
    if (!ctx.actor) return { kind: "deny" };
    if (ctx.actor.role === "admin" || ctx.actor.role === "super_admin") return { kind: "all" };
    return { kind: "sql", where: "uid = ?", params: [ctx.actor.uid] };
  },

  // Inscription : toujours patient_public et actif — jamais d'auto-promotion.
  create: all(
    isOwnerOf("uid"),
    equals("role", "patient_public"),
    equals("status", "active"),
    text("displayName", 0, 120),
  ),

  // Soit le propriétaire (rôle ET statut gelés), soit un admin via la matrice.
  update: any(
    all(isOwnerOf("uid"), frozen(["role", "status"])),
    all(isAdmin, roleTransition("uid")),
  ),

  delete: isSuperAdmin,
};

// =============================================================
// Contenu éditorial global — L123-138 (medications, pathologies, partners…)
// Lecture publique, écriture réservée au staff éditorial.
// =============================================================
export const editorialPolicy: Policy = {
  read: always,
  list: listAll,
  create: isEditor,
  update: isEditor,
  delete: isEditor,
};

// =============================================================
// Contenu éditorial OU d'espace partenaire — L127, 169, 193, 200, 207, 299
// (articles, events, formations, testimonials, partnerOffers, communities)
// =============================================================
export const tenantContentPolicy: Policy = {
  read: always,
  list: listAll,
  create: any(isEditor, tenantCreateOk),
  update: any(isEditor, tenantUpdateOk),
  delete: any(isEditor, tenantDeleteOk),
};

// =============================================================
// equipmentNeeds — L178-190
// Les compteurs de collecte sont écrits EXCLUSIVEMENT par le webhook de don.
// =============================================================
export const equipmentNeedsPolicy: Policy = {
  read: always,
  list: listAll,
  create: any(
    isEditor,
    all(tenantCreateOk, equals("raisedAmount", 0), equals("donorsCount", 0), equals("status", "en_cours")),
  ),
  update: any(isEditor, all(tenantUpdateOk, frozen(["raisedAmount", "donorsCount", "status"]))),
  delete: any(isEditor, tenantDeleteOk),
};

// =============================================================
// facilities — L140-166
// =============================================================
export function facilitiesPolicy(slug: string): Policy {
  return {
    read: always,
    list: listAll,

    create: any(
      isEditor,
      all(
        isActiveUser,
        isOwnerOf("ownerUid"),
        absentOrFalse("published"),
        absentOrFalse("verified"),
        equals("source", "user"),
        slugMatches(slug),
        text("name", 2, 150),
      ),
    ),

    // ⚠️ `published`/`verified` ne sont pas gelés mais FORCÉS à faux : le
    // propriétaire ne peut ni publier ni vérifier son propre établissement,
    // même s'il l'était déjà.
    update: any(
      isEditor,
      all(
        isSignedIn,
        (ctx, prev) => {
          const owner = prev?.ownerUid;
          if (typeof owner !== "string" || owner.length === 0) {
            return deny("établissement éditorial : sans propriétaire");
          }
          return owner === ctx.actor?.uid ? ALLOW : deny("non propriétaire");
        },
        absentOrFalse("published"),
        absentOrFalse("verified"),
        frozen([
          "ownerUid",
          "slug",
          "source",
          "claimStatus",
          "planTier",
          "planId",
          "featured",
          "subscribedUntil",
        ]),
      ),
    ),

    delete: isEditor,
  };
}

// =============================================================
// organizations — L234-274
// =============================================================
export const organizationsPolicy: Policy = {
  read: (ctx, prev) => {
    if (prev?.status === "active") return ALLOW;
    if (!ctx.actor) return deny("page non publiée");
    if (ctx.actor.role === "admin" || ctx.actor.role === "super_admin") return ALLOW;
    if (prev?.ownerUid === ctx.actor.uid) return ALLOW;
    const managers = Array.isArray(prev?.managerUids) ? (prev.managerUids as unknown[]) : [];
    return managers.includes(ctx.actor.uid) ? ALLOW : deny("page non publiée");
  },

  // ⚠️ Là où les règles REJETAIENT une requête trop large, il faut ici FILTRER.
  list: (ctx: Ctx): ListScope => {
    if (!ctx.actor) return { kind: "sql", where: "status = 'active'", params: [] };
    if (ctx.actor.role === "admin" || ctx.actor.role === "super_admin") return { kind: "all" };
    return {
      kind: "sql",
      where:
        "(status = 'active' OR owner_uid = ? OR EXISTS (SELECT 1 FROM json_each(manager_uids) WHERE value = ?))",
      params: [ctx.actor.uid, ctx.actor.uid],
    };
  },

  create: any(
    isAdmin,
    all(
      isActiveUser,
      isOwnerOf("ownerUid"),
      equals("status", "pending"),
      oneOf("type", ["healthcare_facility", "partner", "partner_donor"]),
      text("name", 2, 150),
    ),
  ),

  update: any(
    isAdmin,
    all(
      isSignedIn,
      (ctx, prev) => {
        if (prev?.ownerUid === ctx.actor?.uid) return ALLOW;
        const managers = Array.isArray(prev?.managerUids) ? (prev.managerUids as unknown[]) : [];
        return ctx.actor && managers.includes(ctx.actor.uid) ? ALLOW : deny("non gestionnaire");
      },
      frozen(["status", "ownerUid", "planTier", "planId", "featured", "subscribedUntil"]),
    ),
  ),

  delete: any(isAdmin, isOwnerOf("ownerUid")),
};

// =============================================================
// communities/{slug}/posts — L305-315
// =============================================================
export const communityPostsPolicy: Policy = {
  read: always,
  list: listAll,
  create: all(isActiveUser, isOwnerOf("authorUid"), text("content", 1, 5000)),
  update: any(isOwnerOf("authorUid"), isAdmin),
  delete: any(isOwnerOf("authorUid"), isEditor),
};

// =============================================================
// forumThreads — L317-330
// =============================================================
export const forumThreadsPolicy: Policy = {
  read: always,
  list: listAll,
  create: all(
    isActiveUser,
    isOwnerOf("authorUid"),
    text("title", 1, 200),
    text("excerpt", 1, 5000),
    oneOf("kind", ["question", "discussion", "conseil"]),
  ),
  update: any(isOwnerOf("authorUid"), isAdmin),
  delete: any(isOwnerOf("authorUid"), isEditor),
};

// =============================================================
// conversations + messages — L340-357
// =============================================================
const isParticipant: Rule = (ctx, prev, next) => {
  if (!ctx.actor) return deny("authentification requise");
  const doc = prev ?? next;
  const parts = Array.isArray(doc?.participants) ? (doc.participants as unknown[]) : [];
  return parts.includes(ctx.actor.uid) ? ALLOW : deny("non participant");
};

export const conversationsPolicy: Policy = {
  read: isParticipant,
  list: (ctx: Ctx): ListScope =>
    ctx.actor
      ? {
          kind: "sql",
          where:
            "EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id = conversations.id AND p.uid = ?)",
          params: [ctx.actor.uid],
        }
      : { kind: "deny" },
  create: isParticipant,
  update: isParticipant,
  delete: isParticipant,
};

/** Messages : participant du fil parent ET expéditeur = soi-même. */
export function messagesPolicy(participants: readonly string[]): Policy {
  const inThread: Rule = (ctx) =>
    ctx.actor && participants.includes(ctx.actor.uid) ? ALLOW : deny("non participant");
  return {
    read: inThread,
    list: (ctx: Ctx): ListScope =>
      ctx.actor && participants.includes(ctx.actor.uid) ? { kind: "all" } : { kind: "deny" },
    create: all(inThread, isOwnerOf("senderUid"), text("text", 1, 5000)),
  };
}

// =============================================================
// auditLogs — L369-378 : append-only, lecture admin
// =============================================================
export const auditLogsPolicy: Policy = {
  read: isAdmin,
  list: (ctx: Ctx): ListScope =>
    ctx.actor && (ctx.actor.role === "admin" || ctx.actor.role === "super_admin")
      ? { kind: "all" }
      : { kind: "deny" },
  create: all(isEditor, isOwnerOf("actorUid")),
  update: never,
  delete: never,
};

// =============================================================
// Collections écrites par le serveur — L380-436
// =============================================================
/**
 * ⚠️ Deux vocabulaires distincts, à ne jamais confondre :
 *  - `docField`   : le champ tel que le voit la POLITIQUE, au format API
 *                   (camelCase, identique à domain.ts et à firestore.rules) ;
 *  - `sqlColumn`  : la colonne D1 correspondante (snake_case), utilisée
 *                   uniquement dans le prédicat de cadrage des listes.
 * Les mélanger produirait une règle qui « passe » en lisant `undefined`.
 */
function serverWritten(docField: string, sqlColumn: string): Policy {
  return {
    read: any(isAdmin, isOwnerOf(docField)),
    list: (ctx: Ctx): ListScope => {
      if (!ctx.actor) return { kind: "deny" };
      if (ctx.actor.role === "admin" || ctx.actor.role === "super_admin") return { kind: "all" };
      return { kind: "sql", where: `${sqlColumn} = ?`, params: [ctx.actor.uid] };
    },
    create: never,
    update: never,
    delete: never,
  };
}
export const donationsPolicy = serverWritten("donorUid", "donor_uid");
export const transactionsPolicy = serverWritten("payerUid", "payer_uid");
export const subscriptionsPolicy = serverWritten("subscriberUid", "subscriber_uid");
export const pendingChargesPolicy = serverWritten("payerUid", "payer_uid");
export const ticketsPolicy = serverWritten("buyerUid", "buyer_uid");

// =============================================================
// Refus par défaut — L499. Toute collection inconnue tombe ici.
// =============================================================
export const denyAllPolicy: Policy = {
  read: never,
  list: listDeny,
  create: never,
  update: never,
  delete: never,
};

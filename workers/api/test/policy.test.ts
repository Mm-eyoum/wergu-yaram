/**
 * Tests de non-régression du modèle d'autorisation.
 *
 * PORTAGE 1:1 de firestore.rules.test.ts — mêmes blocs, mêmes intitulés, même
 * ordre, pour qu'une relecture soit une comparaison et non une réinterprétation.
 * L'original tournait contre l'émulateur Firestore (JDK 17 requis en CI) ; ici
 * les politiques sont pures, donc la suite tourne en millisecondes sans Java.
 *
 * Ces tests verrouillent les invariants dont dépend tout le modèle d'accès :
 * personne ne s'auto-promeut, seul un super_admin accorde `admin`, on ne
 * contribue pas sous l'identité d'autrui, une page ne s'auto-valide pas, et les
 * messages privés restent entre participants.
 *
 * ⚠️ AUCUNE collection ne doit basculer de Firestore vers D1 tant que ses tests
 * ici ne sont pas verts.
 */
import { describe, expect, it } from "vitest";
import { actor, anon, can, merge } from "./helpers";
import {
  auditLogsPolicy,
  communityPostsPolicy,
  conversationsPolicy,
  denyAllPolicy,
  donationsPolicy,
  editorialPolicy,
  facilitiesPolicy,
  messagesPolicy,
  organizationsPolicy,
  usersPolicy,
} from "../src/policy/collections";

describe("users — self-signup & role locking", () => {
  it("lets a user create their own patient_public profile", () => {
    const next = { uid: "u1", role: "patient_public", status: "active", displayName: "Awa" };
    expect(can(usersPolicy.create, actor("u1"), null, next)).toBe(true);
  });

  it("rejects self-signup with an elevated role", () => {
    const next = { uid: "u1", role: "admin", status: "active", displayName: "Awa" };
    expect(can(usersPolicy.create, actor("u1"), null, next)).toBe(false);
  });

  it("forbids a user changing their own role or status", () => {
    const prev = { uid: "u1", role: "patient_public", status: "active", displayName: "u1" };
    const self = actor("u1", "patient_public");
    expect(can(usersPolicy.update, self, prev, merge(prev, { role: "admin" }))).toBe(false);
    expect(can(usersPolicy.update, self, prev, merge(prev, { status: "suspended" }))).toBe(false);
  });

  it("forbids reading another user's profile", () => {
    const other = { uid: "u2", role: "patient_public", status: "active" };
    expect(can(usersPolicy.read, actor("u1"), other, null)).toBe(false);
  });

  it("blocks a plain admin from granting admin (super_admin only)", () => {
    const prev = { uid: "u2", role: "patient_public", status: "active" };
    expect(
      can(usersPolicy.update, actor("admin1", "admin"), prev, merge(prev, { role: "admin" })),
    ).toBe(false);
  });

  it("lets a plain admin promote patient_public → editor", () => {
    const prev = { uid: "u2", role: "patient_public", status: "active" };
    expect(
      can(usersPolicy.update, actor("admin1", "admin"), prev, merge(prev, { role: "editor" })),
    ).toBe(true);
  });

  it("lets a plain admin demote editor → patient_public", () => {
    const prev = { uid: "u2", role: "editor", status: "active" };
    expect(
      can(usersPolicy.update, actor("admin1", "admin"), prev, merge(prev, { role: "patient_public" })),
    ).toBe(true);
  });

  it("forbids a plain admin from touching a super_admin's role", () => {
    const prev = { uid: "super2", role: "super_admin", status: "active" };
    expect(
      can(usersPolicy.update, actor("admin1", "admin"), prev, merge(prev, { role: "editor" })),
    ).toBe(false);
  });

  it("forbids an admin from changing their own role", () => {
    const prev = { uid: "admin1", role: "admin", status: "active" };
    expect(
      can(usersPolicy.update, actor("admin1", "admin"), prev, merge(prev, { role: "editor" })),
    ).toBe(false);
  });

  it("lets a super_admin grant admin", () => {
    const prev = { uid: "u2", role: "patient_public", status: "active" };
    expect(
      can(usersPolicy.update, actor("super1", "super_admin"), prev, merge(prev, { role: "admin" })),
    ).toBe(true);
  });

  it("never lets rules demote a super_admin", () => {
    const prev = { uid: "super2", role: "super_admin", status: "active" };
    expect(
      can(usersPolicy.update, actor("super1", "super_admin"), prev, merge(prev, { role: "admin" })),
    ).toBe(false);
  });
});

describe("public content — editor-only writes", () => {
  it("allows anyone to read medications", () => {
    expect(can(editorialPolicy.read, anon(), { id: "m1" }, null)).toBe(true);
  });

  it("forbids a patient_public from writing content", () => {
    expect(can(editorialPolicy.create, actor("u1"), null, { title: "x" })).toBe(false);
  });

  it("lets an editor write content", () => {
    expect(can(editorialPolicy.create, actor("e1", "editor"), null, { title: "x" })).toBe(true);
  });
});

describe("facilities — owner edits (claimed), admin publishes", () => {
  const ownedFacility = {
    slug: "clinique-x",
    name: "Clinique X",
    ownerUid: "u1",
    managerUids: ["u1"],
    published: false,
    verified: false,
  };
  const pol = facilitiesPolicy("clinique-x");

  it("lets the owner edit content fields while staying unpublished", () => {
    const next = merge(ownedFacility, {
      description: "Centre de soins",
      published: false,
      verified: false,
    });
    expect(can(pol.update, actor("u1"), ownedFacility, next)).toBe(true);
  });

  it("forbids the owner from self-publishing", () => {
    expect(can(pol.update, actor("u1"), ownedFacility, merge(ownedFacility, { published: true }))).toBe(
      false,
    );
  });

  it("forbids the owner from self-verifying", () => {
    expect(can(pol.update, actor("u1"), ownedFacility, merge(ownedFacility, { verified: true }))).toBe(
      false,
    );
  });

  it("forbids the owner from reassigning ownership", () => {
    expect(can(pol.update, actor("u1"), ownedFacility, merge(ownedFacility, { ownerUid: "u2" }))).toBe(
      false,
    );
  });

  it("forbids a non-owner patient from editing the facility", () => {
    expect(
      can(pol.update, actor("u2"), ownedFacility, merge(ownedFacility, { description: "hack" })),
    ).toBe(false);
  });

  it("forbids a patient from editing an editorial facility (no owner)", () => {
    const editorial = { slug: "editorial", name: "Hôpital", published: true };
    const editorialPol = facilitiesPolicy("editorial");
    expect(
      can(editorialPol.update, actor("u1"), editorial, merge(editorial, { description: "x" })),
    ).toBe(false);
  });

  it("lets an editor publish an owner-submitted facility", () => {
    const next = merge(ownedFacility, { published: true, verified: true });
    expect(can(pol.update, actor("e1", "editor"), ownedFacility, next)).toBe(true);
  });
});

describe("organizations — create pending, admin validates", () => {
  const base = {
    ownerUid: "u1",
    managerUids: ["u1"],
    type: "healthcare_facility",
    name: "Clinique du Centre",
  };

  it("lets an active user create a pending page they own", () => {
    expect(can(organizationsPolicy.create, actor("u1"), null, { ...base, status: "pending" })).toBe(
      true,
    );
  });

  it("forbids self-validating a page to active on create", () => {
    expect(can(organizationsPolicy.create, actor("u1"), null, { ...base, status: "active" })).toBe(
      false,
    );
  });

  it("forbids a manager from flipping status to active", () => {
    const prev = { ...base, status: "pending" };
    expect(
      can(organizationsPolicy.update, actor("u1"), prev, merge(prev, { status: "active" })),
    ).toBe(false);
  });
});

describe("community / forum — anti-impersonation", () => {
  it("forbids posting under another author's uid", () => {
    expect(
      can(communityPostsPolicy.create, actor("u1"), null, {
        authorUid: "someone-else",
        content: "Coucou",
      }),
    ).toBe(false);
  });

  it("forbids a suspended user from posting", () => {
    const suspended = actor("u1", "patient_public", "suspended");
    expect(
      can(communityPostsPolicy.create, suspended, null, { authorUid: "u1", content: "Coucou" }),
    ).toBe(false);
  });

  it("lets an active member post under their own uid", () => {
    expect(
      can(communityPostsPolicy.create, actor("u1"), null, {
        authorUid: "u1",
        content: "Bonjour la communauté",
      }),
    ).toBe(true);
  });
});

describe("private messaging — participants only", () => {
  const conv = { id: "conv1", participants: ["a", "b"] };

  it("forbids a non-participant from reading a conversation", () => {
    expect(can(conversationsPolicy.read, actor("c"), conv, null)).toBe(false);
  });

  it("forbids sending a message as someone else", () => {
    const pol = messagesPolicy(["a", "b"]);
    expect(can(pol.create, actor("a"), null, { senderUid: "b", text: "Salut" })).toBe(false);
  });

  it("lets a participant send a message as themselves", () => {
    const pol = messagesPolicy(["a", "b"]);
    expect(can(pol.create, actor("a"), null, { senderUid: "a", text: "Salut" })).toBe(true);
  });
});

describe("audit logs — append-only", () => {
  it("forbids mutating an existing audit entry", () => {
    const prev = { id: "log1", actorUid: "e1", action: "create" };
    expect(
      can(auditLogsPolicy.update, actor("e1", "editor"), prev, merge(prev, { action: "delete" })),
    ).toBe(false);
  });

  it("forbids a non-admin from reading the audit trail", () => {
    expect(can(auditLogsPolicy.read, actor("u1"), { actorUid: "x", action: "create" }, null)).toBe(
      false,
    );
  });
});

describe("donations — server-written, owner/admin read", () => {
  it("forbids any client from writing a donation", () => {
    expect(can(donationsPolicy.create, actor("u1"), null, { donorUid: "u1", amount: 1000 })).toBe(
      false,
    );
  });

  it("lets a donor read their own donation", () => {
    const don = { donorUid: "u1", amount: 1000, status: "succeeded" };
    expect(can(donationsPolicy.read, actor("u1"), don, null)).toBe(true);
  });

  it("forbids reading another donor's donation", () => {
    const don = { donorUid: "u1", amount: 1000, status: "succeeded" };
    expect(can(donationsPolicy.read, actor("u2"), don, null)).toBe(false);
  });
});

describe("default deny", () => {
  it("denies reads/writes on an unknown collection", () => {
    expect(can(denyAllPolicy.read, actor("u1"), { a: 1 }, null)).toBe(false);
    expect(can(denyAllPolicy.create, actor("u1"), null, { a: 1 })).toBe(false);
    expect(denyAllPolicy.list(actor("u1")).kind).toBe("deny");
  });
});

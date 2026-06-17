/**
 * Security-rules regression tests for `firestore.rules`.
 *
 * Runs against the Firestore emulator — NOT part of the jsdom unit suite. Launch
 * via `npm run test:rules` (which wraps it in `firebase emulators:exec`). The
 * emulator requires Java 11+, so this runs in CI (see .github/workflows/ci.yml),
 * not necessarily on a dev box with an older JDK.
 *
 * These lock the invariants the app's access model depends on: a user can never
 * self-promote, only super_admins grant admin, contributions can't be forged
 * under another author, pages can't self-validate, and private messages stay
 * between participants.
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-werguyaram",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/** Seed a profile doc (role/status) that the rules' get() calls read. */
async function seedProfile(uid: string, role: string, status = "active") {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users", uid), { role, status, displayName: uid });
  });
}

async function seedDoc(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

describe("users — self-signup & role locking", () => {
  it("lets a user create their own patient_public profile", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users", "u1"), {
        role: "patient_public",
        status: "active",
        displayName: "Awa",
      }),
    );
  });

  it("rejects self-signup with an elevated role", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      setDoc(doc(db, "users", "u1"), { role: "admin", status: "active", displayName: "Awa" }),
    );
  });

  it("forbids a user changing their own role or status", async () => {
    await seedProfile("u1", "patient_public");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(updateDoc(doc(db, "users", "u1"), { role: "admin" }));
    await assertFails(updateDoc(doc(db, "users", "u1"), { status: "suspended" }));
  });

  it("forbids reading another user's profile", async () => {
    await seedProfile("u2", "patient_public");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(getDoc(doc(db, "users", "u2")));
  });

  it("blocks a plain admin from granting admin (super_admin only)", async () => {
    await seedProfile("admin1", "admin");
    await seedProfile("u2", "patient_public");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertFails(updateDoc(doc(db, "users", "u2"), { role: "admin" }));
  });

  it("lets a plain admin promote patient_public → editor", async () => {
    await seedProfile("admin1", "admin");
    await seedProfile("u2", "patient_public");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(updateDoc(doc(db, "users", "u2"), { role: "editor" }));
  });

  it("lets a plain admin demote editor → patient_public", async () => {
    await seedProfile("admin1", "admin");
    await seedProfile("u2", "editor");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(updateDoc(doc(db, "users", "u2"), { role: "patient_public" }));
  });

  it("forbids a plain admin from touching a super_admin's role", async () => {
    await seedProfile("admin1", "admin");
    await seedProfile("super2", "super_admin");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertFails(updateDoc(doc(db, "users", "super2"), { role: "editor" }));
  });

  it("forbids an admin from changing their own role", async () => {
    await seedProfile("admin1", "admin");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertFails(updateDoc(doc(db, "users", "admin1"), { role: "editor" }));
  });

  it("lets a super_admin grant admin", async () => {
    await seedProfile("super1", "super_admin");
    await seedProfile("u2", "patient_public");
    const db = testEnv.authenticatedContext("super1").firestore();
    await assertSucceeds(updateDoc(doc(db, "users", "u2"), { role: "admin" }));
  });

  it("never lets rules demote a super_admin", async () => {
    await seedProfile("super1", "super_admin");
    await seedProfile("super2", "super_admin");
    const db = testEnv.authenticatedContext("super1").firestore();
    await assertFails(updateDoc(doc(db, "users", "super2"), { role: "admin" }));
  });
});

describe("public content — editor-only writes", () => {
  it("allows anyone to read medications", async () => {
    await seedDoc("medications/paracetamol", { name: "Paracétamol", published: true });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "medications", "paracetamol")));
  });

  it("forbids a patient_public from writing content", async () => {
    await seedProfile("u1", "patient_public");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(setDoc(doc(db, "medications", "x"), { name: "X" }));
  });

  it("lets an editor write content", async () => {
    await seedProfile("e1", "editor");
    const db = testEnv.authenticatedContext("e1").firestore();
    await assertSucceeds(setDoc(doc(db, "articles", "a1"), { title: "A", published: true }));
  });
});

describe("organizations — create pending, admin validates", () => {
  it("lets an active user create a pending page they own", async () => {
    await seedProfile("u1", "patient_public");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(
      setDoc(doc(db, "organizations", "o1"), {
        ownerUid: "u1",
        managerUids: ["u1"],
        status: "pending",
        type: "healthcare_facility",
        name: "Clinique du Centre",
      }),
    );
  });

  it("forbids self-validating a page to active on create", async () => {
    await seedProfile("u1", "patient_public");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      setDoc(doc(db, "organizations", "o1"), {
        ownerUid: "u1",
        managerUids: ["u1"],
        status: "active",
        type: "healthcare_facility",
        name: "Clinique du Centre",
      }),
    );
  });

  it("forbids a manager from flipping status to active", async () => {
    await seedProfile("u1", "patient_public");
    await seedDoc("organizations/o1", {
      ownerUid: "u1",
      managerUids: ["u1"],
      status: "pending",
      type: "healthcare_facility",
      name: "Clinique du Centre",
    });
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(updateDoc(doc(db, "organizations", "o1"), { status: "active" }));
  });
});

describe("community / forum — anti-impersonation", () => {
  it("forbids posting under another author's uid", async () => {
    await seedProfile("u1", "patient_public");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      setDoc(doc(db, "communities/c1/posts/p1"), { authorUid: "someone-else", content: "Coucou" }),
    );
  });

  it("forbids a suspended user from posting", async () => {
    await seedProfile("u1", "patient_public", "suspended");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      setDoc(doc(db, "communities/c1/posts/p1"), { authorUid: "u1", content: "Coucou" }),
    );
  });

  it("lets an active member post under their own uid", async () => {
    await seedProfile("u1", "patient_public");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(
      setDoc(doc(db, "communities/c1/posts/p1"), { authorUid: "u1", content: "Bonjour la communauté" }),
    );
  });
});

describe("private messaging — participants only", () => {
  it("forbids a non-participant from reading a conversation", async () => {
    await seedDoc("conversations/conv1", { participants: ["a", "b"] });
    const db = testEnv.authenticatedContext("c").firestore();
    await assertFails(getDoc(doc(db, "conversations", "conv1")));
  });

  it("forbids sending a message as someone else", async () => {
    await seedDoc("conversations/conv1", { participants: ["a", "b"] });
    const db = testEnv.authenticatedContext("a").firestore();
    await assertFails(
      setDoc(doc(db, "conversations/conv1/messages/m1"), { senderUid: "b", text: "Salut" }),
    );
  });

  it("lets a participant send a message as themselves", async () => {
    await seedDoc("conversations/conv1", { participants: ["a", "b"] });
    const db = testEnv.authenticatedContext("a").firestore();
    await assertSucceeds(
      setDoc(doc(db, "conversations/conv1/messages/m1"), { senderUid: "a", text: "Salut" }),
    );
  });
});

describe("audit logs — append-only", () => {
  it("forbids mutating an existing audit entry", async () => {
    await seedProfile("e1", "editor");
    await seedDoc("auditLogs/log1", { actorUid: "e1", action: "create" });
    const db = testEnv.authenticatedContext("e1").firestore();
    await assertFails(updateDoc(doc(db, "auditLogs", "log1"), { action: "delete" }));
  });

  it("forbids a non-admin from reading the audit trail", async () => {
    await seedProfile("u1", "patient_public");
    await seedDoc("auditLogs/log1", { actorUid: "x", action: "create" });
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(getDoc(doc(db, "auditLogs", "log1")));
  });
});

describe("donations — server-written, owner/admin read", () => {
  it("forbids any client from writing a donation", async () => {
    await seedProfile("u1", "patient_public");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(setDoc(doc(db, "donations", "d1"), { donorUid: "u1", amount: 1000 }));
  });

  it("lets a donor read their own donation", async () => {
    await seedProfile("u1", "patient_public");
    await seedDoc("donations/d1", { donorUid: "u1", amount: 1000, status: "succeeded" });
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(getDoc(doc(db, "donations", "d1")));
  });

  it("forbids reading another donor's donation", async () => {
    await seedProfile("u2", "patient_public");
    await seedDoc("donations/d1", { donorUid: "u1", amount: 1000, status: "succeeded" });
    const db = testEnv.authenticatedContext("u2").firestore();
    await assertFails(getDoc(doc(db, "donations", "d1")));
  });
});

describe("default deny", () => {
  it("denies reads/writes on an unknown collection", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(getDoc(doc(db, "secretStuff", "x")));
    await assertFails(setDoc(doc(db, "secretStuff", "x"), { a: 1 }));
  });
});

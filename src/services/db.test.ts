/**
 * Tests du shim Firestore → API.
 *
 * Ce qu'ils verrouillent : la traduction des contraintes en paramètres d'URL, la
 * réhydratation des horodatages, et la forme exacte des instantanés. Ce sont les
 * trois choses qui, si elles dérivent, cassent SILENCIEUSEMENT les 29 fichiers
 * de services — une liste vide au lieu d'une erreur, un `.toDate()` sur
 * `undefined`, un `snap.empty` toujours faux.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({ db: undefined, auth: undefined }));
vi.mock("./dbRouting", () => ({
  readsFromD1: (name: string) => name !== "resteSurFirestore",
  writesToD1: (name: string) => name !== "resteSurFirestore",
  usesD1: (name: string) => name !== "resteSurFirestore",
  routeFor: () => "d1",
}));

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "./db";

const calls: string[] = [];
const requests: { url: string; method: string; body: unknown }[] = [];
function stubFetch(payload: unknown, status = 200) {
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(String(url));
    requests.push({
      url: String(url),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
    });
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  calls.length = 0;
  requests.length = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("traduction des requêtes", () => {
  it("transforme where + limit en paramètres d'URL", async () => {
    stubFetch({ items: [] });
    await getDocs(
      query(collection(null, "communities"), where("tenantSlug", "==", "eyone"), limit(50)),
    );
    expect(calls[0]).toContain("/api/v1/collections/communities");
    expect(calls[0]).toContain("where=tenantSlug%3Aeq%3Aeyone");
    expect(calls[0]).toContain("limit=50");
  });

  it("refuse un opérateur non supporté plutôt que de l'ignorer", async () => {
    stubFetch({ items: [] });
    await expect(
      getDocs(query(collection(null, "medications"), where("price", ">", 10))),
    ).rejects.toThrow(/non supporté/);
  });
});

describe("forme des instantanés", () => {
  it("expose id, data(), empty, size et forEach", async () => {
    stubFetch({ items: [{ slug: "abacavir-abc", name: "Abacavir" }, { slug: "b", name: "B" }] });
    const snap = await getDocs(collection(null, "medications"));
    expect(snap.size).toBe(2);
    expect(snap.empty).toBe(false);
    expect(snap.docs[0].id).toBe("abacavir-abc");
    expect(snap.docs[0].data()).toMatchObject({ name: "Abacavir" });
    const vus: string[] = [];
    snap.forEach((d) => vus.push(d.id));
    expect(vus).toEqual(["abacavir-abc", "b"]);
  });

  it("expose ref.path et ref.parent.parent.id (utilisés par la modération)", async () => {
    const ref = doc(null, "communities/sante-digitale/posts/p1");
    expect(ref.path).toBe("communities/sante-digitale/posts/p1");
    expect(ref.id).toBe("p1");
    expect(ref.parent.parent?.id).toBe("sante-digitale");
  });

  it("un 404 devient exists() === false, pas une exception", async () => {
    stubFetch({ error: "Document introuvable.", code: "not-found" }, 404);
    const snap = await getDoc(doc(null, "medications", "inexistant"));
    expect(snap.exists()).toBe(false);
    expect(snap.data()).toBeUndefined();
  });
});

describe("horodatages", () => {
  it("réhydrate {__ts} en objet à toDate()/toMillis()", async () => {
    const ms = 1_735_689_600_000;
    stubFetch({ items: [{ slug: "x", createdAt: { __ts: ms } }] });
    const snap = await getDocs(collection(null, "articles"));
    const created = snap.docs[0].data()?.createdAt as Timestamp;
    expect(created.toMillis()).toBe(ms);
    expect(created.toDate().toISOString()).toBe(new Date(ms).toISOString());
  });

  it("réhydrate en profondeur, y compris dans les tableaux", async () => {
    stubFetch({
      items: [{ slug: "x", meta: { at: { __ts: 1000 } }, jalons: [{ at: { __ts: 2000 } }] }],
    });
    const snap = await getDocs(collection(null, "articles"));
    const d = snap.docs[0].data() as { meta: { at: Timestamp }; jalons: { at: Timestamp }[] };
    expect(d.meta.at.toMillis()).toBe(1000);
    expect(d.jalons[0].at.toMillis()).toBe(2000);
  });

  it("Timestamp.fromMillis round-trip (utilisé par la pagination de media.ts)", () => {
    const t = Timestamp.fromMillis(1_700_000_123_456);
    expect(t.toMillis()).toBe(1_700_000_123_456);
  });
});

describe("routage", () => {
  it("une collection non basculée n'appelle pas l'API", async () => {
    stubFetch({ items: [] });
    const snap = await getDocs(collection(null, "resteSurFirestore"));
    expect(calls).toHaveLength(0); // Firestore absent dans ce test ⇒ résultat vide
    expect(snap.empty).toBe(true);
  });
});

describe("écritures", () => {
  it("addDoc → POST sur la collection", async () => {
    stubFetch({ id: "genere-par-le-serveur" });
    const ref = await addDoc(collection(null, "articles"), { title: "Nouveau" });
    expect(requests[0].method).toBe("POST");
    expect(requests[0].url).toContain("/api/v1/collections/articles");
    expect(requests[0].body).toMatchObject({ title: "Nouveau" });
    expect(ref.id).toBe("genere-par-le-serveur");
  });

  it("updateDoc → PATCH (fusion), setDoc → PUT (remplacement)", async () => {
    stubFetch({});
    await updateDoc(doc(null, "articles", "a1"), { title: "Modifié" });
    expect(requests[0].method).toBe("PATCH");

    requests.length = 0;
    await setDoc(doc(null, "articles", "a1"), { title: "Remplacé" });
    expect(requests[0].method).toBe("PUT");
  });

  it("setDoc({merge:true}) → PATCH, pas PUT", async () => {
    stubFetch({});
    await setDoc(doc(null, "articles", "a1"), { title: "Fusion" }, { merge: true });
    expect(requests[0].method).toBe("PATCH");
  });

  it("deleteDoc → DELETE", async () => {
    stubFetch({ deleted: "a1" });
    await deleteDoc(doc(null, "articles", "a1"));
    expect(requests[0].method).toBe("DELETE");
    expect(requests[0].url).toContain("/articles/a1");
  });

  it("serverTimestamp() devient une sentinelle, jamais une date du client", async () => {
    stubFetch({});
    await updateDoc(doc(null, "articles", "a1"), {
      title: "X",
      updatedAt: serverTimestamp(),
    });
    const body = requests[0].body as Record<string, unknown>;
    expect(body.updatedAt).toBe("__server_timestamp__");
  });

  it("refuse une sentinelle non supportée plutôt que de l'envoyer telle quelle", async () => {
    stubFetch({});
    const faux = { _methodName: "increment" };
    await expect(updateDoc(doc(null, "articles", "a1"), { n: faux })).rejects.toThrow(
      /non supportée/,
    );
  });

  it("une collection non basculée n'appelle pas l'API en écriture", async () => {
    stubFetch({});
    await expect(
      updateDoc(doc(null, "resteSurFirestore", "x"), { a: 1 }),
    ).rejects.toThrow(/Firebase non configuré/);
    expect(requests).toHaveLength(0);
  });
});

describe("mode lecture seule (bascule)", () => {
  it("route les lectures vers D1 mais laisse les écritures à Firestore", async () => {
    vi.resetModules();
    // `d1-read` : lectures sur D1, écritures toujours sur Firestore. C'est ce qui
    // rend le retour arrière GRATUIT — aucune écriture n'a été faite ailleurs.
    vi.doMock("./dbRouting", () => ({
      readsFromD1: () => true,
      writesToD1: () => false,
      usesD1: () => false,
      routeFor: () => "d1-read",
    }));
    const db = await import("./db");
    stubFetch({ items: [{ slug: "x", name: "X" }] });

    const snap = await db.getDocs(db.collection(null, "articles"));
    expect(snap.size).toBe(1); // lecture servie par l'API
    expect(requests.filter((r) => r.method === "GET")).toHaveLength(1);

    // L'écriture ne doit PAS partir vers l'API : Firestore reste maître.
    await expect(db.updateDoc(db.doc(null, "articles", "x"), { a: 1 })).rejects.toThrow(
      /Firebase non configuré/,
    );
    expect(requests.filter((r) => r.method === "PATCH")).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import { getMedications, getMedicationBySlug } from "./catalog";

/**
 * In the test environment no VITE_FIREBASE_* vars are set, so `db` is
 * undefined and the catalog must transparently fall back to the bundled mock
 * data. This is exactly the "Firestore not configured / empty" path that keeps
 * the app working before seeding.
 */
describe("catalog mock fallback (no Firebase configured)", () => {
  it("getMedications returns the bundled mock list", async () => {
    const list = await getMedications();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it("getMedicationBySlug resolves an existing slug", async () => {
    const [first] = await getMedications();
    const found = await getMedicationBySlug(first.slug);
    expect(found?.slug).toBe(first.slug);
  });

  it("returns null for an unknown slug", async () => {
    expect(await getMedicationBySlug("__does-not-exist__")).toBeNull();
  });

  it("returns null when no id is provided", async () => {
    expect(await getMedicationBySlug(undefined)).toBeNull();
  });
});

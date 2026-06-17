import { describe, it, expect } from "vitest";
import { searchContent, searchCounts } from "./content";

describe("searchContent", () => {
  it("returns the full pool for an empty query", async () => {
    expect((await searchContent("")).length).toBeGreaterThan(0);
  });

  it("returns nothing for a nonsense query", async () => {
    expect(await searchContent("zzqwerty-no-such-term-123")).toHaveLength(0);
  });

  it("restricts results to the requested scope", async () => {
    const meds = await searchContent("", "medicament");
    expect(meds.length).toBeGreaterThan(0);
    expect(meds.every((h) => h.type === "medicament")).toBe(true);
  });

  it("never returns more scoped hits than the full pool", async () => {
    expect((await searchContent("", "medicament")).length).toBeLessThanOrEqual(
      (await searchContent("", "all")).length,
    );
  });
});

describe("searchCounts", () => {
  it("reports an 'all' count equal to the full result set", async () => {
    const counts = await searchCounts("");
    expect(counts.all).toBe((await searchContent("", "all")).length);
  });

  it("per-type counts sum to the total", async () => {
    const counts = await searchCounts("");
    const perType = Object.entries(counts)
      .filter(([key]) => key !== "all")
      .reduce((sum, [, n]) => sum + n, 0);
    expect(perType).toBe(counts.all);
  });
});

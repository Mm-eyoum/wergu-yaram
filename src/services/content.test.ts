import { describe, it, expect } from "vitest";
import { searchContent, searchCounts } from "./content";

describe("searchContent", () => {
  it("returns the full pool for an empty query", () => {
    expect(searchContent("").length).toBeGreaterThan(0);
  });

  it("returns nothing for a nonsense query", () => {
    expect(searchContent("zzqwerty-no-such-term-123")).toHaveLength(0);
  });

  it("restricts results to the requested scope", () => {
    const meds = searchContent("", "medicament");
    expect(meds.length).toBeGreaterThan(0);
    expect(meds.every((h) => h.type === "medicament")).toBe(true);
  });

  it("never returns more scoped hits than the full pool", () => {
    expect(searchContent("", "medicament").length).toBeLessThanOrEqual(
      searchContent("", "all").length,
    );
  });
});

describe("searchCounts", () => {
  it("reports an 'all' count equal to the full result set", () => {
    const counts = searchCounts("");
    expect(counts.all).toBe(searchContent("", "all").length);
  });

  it("per-type counts sum to the total", () => {
    const counts = searchCounts("");
    const perType = Object.entries(counts)
      .filter(([key]) => key !== "all")
      .reduce((sum, [, n]) => sum + n, 0);
    expect(perType).toBe(counts.all);
  });
});

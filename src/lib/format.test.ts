import { describe, it, expect } from "vitest";
import { formatFcfa, formatCompact, percent, initials } from "./format";

// Intl uses narrow/no-break spaces as group separators; \s matches them so we
// normalise to a plain space before asserting.
const norm = (s: string) => s.replace(/\s/g, " ");

describe("formatFcfa", () => {
  it("formats with thousands separators and the FCFA suffix", () => {
    expect(norm(formatFcfa(30000))).toBe("30 000 FCFA");
  });
  it("rounds to the nearest integer", () => {
    expect(norm(formatFcfa(1234.6))).toBe("1 235 FCFA");
  });
  it("handles zero", () => {
    expect(norm(formatFcfa(0))).toBe("0 FCFA");
  });
});

describe("formatCompact", () => {
  it("uses compact millions notation", () => {
    expect(formatCompact(1_000_000)).toContain("M");
  });
});

describe("percent", () => {
  it("computes a rounded percentage", () => {
    expect(percent(50, 200)).toBe(25);
  });
  it("clamps above 100", () => {
    expect(percent(300, 200)).toBe(100);
  });
  it("returns 0 when the target is non-positive", () => {
    expect(percent(5, 0)).toBe(0);
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Aïssatou Diop")).toBe("AD");
  });
  it("handles a single name", () => {
    expect(initials("madonna")).toBe("M");
  });
  it("ignores extra words and whitespace", () => {
    expect(initials("  jean  paul  pierre ")).toBe("JP");
  });
});

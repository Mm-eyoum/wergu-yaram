import { describe, it, expect } from "vitest";
import { tenantSlugError, RESERVED_SUBS } from "./tenantHost";

describe("tenantSlugError", () => {
  it("accepts valid DNS-label slugs", () => {
    expect(tenantSlugError("assad")).toBeNull();
    expect(tenantSlugError("croix-rouge")).toBeNull();
    expect(tenantSlugError("ong2025")).toBeNull();
  });

  it("rejects slugs shorter than 3 or longer than 63 chars", () => {
    expect(tenantSlugError("ab")).toMatch(/3 et 63/);
    expect(tenantSlugError("a".repeat(64))).toMatch(/3 et 63/);
  });

  it("rejects uppercase, spaces and leading/trailing hyphens", () => {
    expect(tenantSlugError("Assad")).toMatch(/minuscules/);
    expect(tenantSlugError("mon espace")).toMatch(/minuscules/);
    expect(tenantSlugError("-assad")).toMatch(/minuscules/);
    expect(tenantSlugError("assad-")).toMatch(/minuscules/);
    expect(tenantSlugError("assad--ong")).toMatch(/minuscules/);
    expect(tenantSlugError("épsi")).toMatch(/minuscules/);
  });

  it("rejects reserved service sub-domains", () => {
    for (const sub of RESERVED_SUBS) {
      expect(tenantSlugError(sub)).toMatch(/réservé/);
    }
  });
});

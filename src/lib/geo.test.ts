import { describe, expect, it } from "vitest";
import { haversineKm, formatDistance, directionsUrl, hasCoords } from "./geo";

describe("geo utilities", () => {
  it("haversineKm is ~0 for identical points", () => {
    const p = { lat: 14.6928, lng: -17.4607 };
    expect(haversineKm(p, p)).toBeCloseTo(0, 5);
  });

  it("haversineKm matches a known Dakar↔Thiès distance (~57 km)", () => {
    const dakar = { lat: 14.6928, lng: -17.4467 };
    const thies = { lat: 14.7886, lng: -16.9246 };
    const d = haversineKm(dakar, thies);
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(65);
  });

  it("formatDistance switches units and uses a French decimal comma", () => {
    expect(formatDistance(0.85)).toBe("850 m");
    expect(formatDistance(3.24)).toBe("3,2 km");
    expect(formatDistance(12.6)).toBe("13 km");
  });

  it("directionsUrl targets the right provider", () => {
    const to = { lat: 14.7, lng: -17.4 };
    expect(directionsUrl(to)).toContain("google.com/maps/dir");
    expect(directionsUrl(to, "waze")).toContain("waze.com");
    expect(directionsUrl(to, "apple")).toContain("maps.apple.com");
  });

  it("hasCoords guards against missing/NaN coordinates", () => {
    expect(hasCoords({ coords: { lat: 14, lng: -17 } })).toBe(true);
    expect(hasCoords({ coords: undefined })).toBe(false);
    expect(hasCoords(null)).toBe(false);
    expect(hasCoords({ coords: { lat: NaN, lng: -17 } })).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { placeTypesToCategory, inferCategoryFromName } from "./facilityTaxonomy";

describe("placeTypesToCategory", () => {
  it("maps Google Places type tags", () => {
    expect(placeTypesToCategory(["pharmacy"])).toBe("pharmacie");
    expect(placeTypesToCategory(["hospital"])).toBe("hopital");
    expect(placeTypesToCategory(["dentist"])).toBe("cabinet_dentaire");
  });

  it("maps OpenStreetMap amenity/healthcare tag values", () => {
    expect(placeTypesToCategory(["doctors"])).toBe("cabinet");
    expect(placeTypesToCategory(["laboratory"])).toBe("laboratoire");
    expect(placeTypesToCategory(["centre"])).toBe("centre_sante");
    expect(placeTypesToCategory(["midwife"])).toBe("maternite");
    expect(placeTypesToCategory(["clinic"])).toBe("clinique");
  });

  it("ignores empty/unknown tags and falls back to null", () => {
    expect(placeTypesToCategory([])).toBeNull();
    expect(placeTypesToCategory(["", undefined as unknown as string])).toBeNull();
    expect(placeTypesToCategory(["restaurant"])).toBeNull();
  });

  it("name inference covers Senegalese health-structure naming", () => {
    expect(inferCategoryFromName("Poste de santé de Fann")).toBe("poste_sante");
    expect(inferCategoryFromName("Pharmacie du Plateau")).toBe("pharmacie");
    expect(inferCategoryFromName("Maternité Roi Baudouin")).toBe("maternite");
    expect(inferCategoryFromName("")).toBe("autre");
  });
});

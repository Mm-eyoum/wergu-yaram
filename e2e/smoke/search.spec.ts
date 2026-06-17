import { test, expect } from "@playwright/test";

/**
 * Smoke — Recherche & détail & carte (read-only, données catalogue/mock).
 * Réf. cahier: docs/qa/cahier-de-tests.md §5 (S-06, S-07, S-08).
 *
 * La recherche à requête vide = « parcourir tout » (useSearch → pool complet),
 * et le catalogue retombe sur les données mock embarquées si Firestore est vide :
 * ces tests ont donc toujours du contenu à afficher.
 */

test("S-06 / T-100 — la recherche par type liste des résultats", async ({ page }) => {
  await page.goto("/recherche?type=medicament");
  // Au moins un lien vers une fiche médicament doit apparaître.
  await expect(page.locator('a[href^="/medicaments/"]').first()).toBeVisible();
});

test("S-07 / T-104 — un résultat mène à sa page de détail", async ({ page }) => {
  await page.goto("/recherche?type=medicament");
  await page.locator('a[href^="/medicaments/"]').first().click();
  await expect(page).toHaveURL(/\/medicaments\/.+/);
  // La fiche affiche un titre (h1) non vide.
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});

test("S-08 / T-114 — la carte s'initialise et affiche des points", async ({ page }) => {
  await page.goto("/carte");
  // Conteneur Leaflet présent.
  await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 });
  // Markers (ou clusters, le clustering est activé) présents.
  await expect(page.locator(".leaflet-marker-icon, .marker-cluster").first()).toBeVisible({
    timeout: 15_000,
  });
});

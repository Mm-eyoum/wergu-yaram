import { test, expect } from "@playwright/test";

/**
 * Smoke — Accueil, 404, robustesse de rendu (read-only, sans auth).
 * Réf. cahier: docs/qa/cahier-de-tests.md §5 (S-01, S-16, S-18).
 */

test("S-01 / T-001 — l'accueil charge (titre + nav principale)", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Wergu Yaram/i);
  // Chaque destination de PRIMARY_NAV doit être présente dans l'en-tête.
  for (const label of [/Carte/i, /Communautés/i, /Forum/i, /Équipements|Besoins/i, /Partenaires/i]) {
    await expect(page.getByRole("link", { name: label }).first()).toBeVisible();
  }
});

test("S-16 / T-009 — URL inconnue affiche la 404", async ({ page }) => {
  await page.goto("/cette-page-nexiste-pas");
  await expect(page.getByText(/introuvable|404|n'existe pas/i).first()).toBeVisible();
  // La 404 propose un retour utile vers l'accueil.
  await expect(page.getByRole("link", { name: /accueil/i }).first()).toBeVisible();
});

test("S-18 / T-181 — les pages clés rendent sans erreur (pas d'ErrorBoundary)", async ({ page }) => {
  const routes = ["/", "/recherche", "/carte", "/communautes", "/forum", "/besoins", "/partenaires"];
  for (const route of routes) {
    const res = await page.goto(route);
    expect(res?.status(), `status HTTP pour ${route}`).toBeLessThan(500);
    // Le fallback ErrorBoundary ne doit jamais apparaître sur une page saine.
    await expect(
      page.getByText(/Une erreur est survenue/i),
      `ErrorBoundary visible sur ${route}`,
    ).toHaveCount(0);
  }
});

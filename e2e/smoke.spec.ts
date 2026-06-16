import { test, expect } from "@playwright/test";

/**
 * Smoke suite — verifies the app boots, content renders (mock fallback when
 * Firestore is empty), core navigation works, and protected routes redirect.
 */

test("home page loads with hero search and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Wergu Yaram/i);
  // Primary nav is present.
  await expect(page.getByRole("link", { name: /Communautés/i }).first()).toBeVisible();
});

test("communities listing renders cards (catalog data)", async ({ page }) => {
  await page.goto("/communautes");
  await expect(page.getByRole("heading", { name: /Communautés/i }).first()).toBeVisible();
  // At least one community card link to a detail page should appear.
  await expect(page.locator('a[href^="/communautes/"]').first()).toBeVisible();
});

test("unknown route shows the 404 page", async ({ page }) => {
  await page.goto("/cette-page-nexiste-pas");
  await expect(page.getByText(/introuvable|404|n'existe pas/i).first()).toBeVisible();
});

test("a protected route redirects anonymous users to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/connexion/);
});

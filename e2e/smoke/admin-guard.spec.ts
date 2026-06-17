import { test, expect } from "@playwright/test";

/**
 * Smoke — Garde d'accès admin & modération.
 * Réf. cahier: docs/qa/cahier-de-tests.md §5 (S-12, S-13, S-15, S-17).
 * Pré-requis: utilisateur patient_public + admin de test.
 */

test.fixme("S-15 / T-200 — un user normal ne peut pas atteindre /admin", async ({ page }) => {
  // TODO: se connecter en patient_public puis ouvrir /admin/users.
  await page.goto("/admin/users");
  // Refus attendu: redirection hors admin OU écran « Accès réservé ».
  await expect(page.getByText(/accès réservé|connexion/i).first()).toBeVisible();
});

test.fixme("S-12 / T-090 — création de page → status pending", async ({ page }) => {
  // TODO: connecté, /dashboard/pages/new → remplir → Créer.
  // Vérifier que la page apparaît en « Mes organisations » avec statut en attente.
  await page.goto("/dashboard/pages/new");
});

test.fixme("S-13 / T-091 — modération: l'approbation publie la page", async ({ page }) => {
  // TODO: admin, /admin/moderation → onglet pages → Approuver.
  // Vérifier que /structures/:id devient public (status active).
  await page.goto("/admin/moderation");
});

test.fixme("S-17 / T-206 — en-têtes de sécurité (CSP) présents", async ({ page }) => {
  const res = await page.goto("/");
  const headers = res?.headers() ?? {};
  // TODO: ajuster aux noms d'en-têtes réellement servis (hosting/CDN).
  expect(headers["content-security-policy"], "CSP attendue").toBeTruthy();
});

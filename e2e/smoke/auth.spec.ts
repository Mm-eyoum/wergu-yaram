import { test, expect } from "@playwright/test";

/**
 * Smoke — Authentification.
 * Réf. cahier: docs/qa/cahier-de-tests.md §5 (S-02..S-05, S-14).
 * Pré-requis: utilisateur de test + (idéalement) Firebase Auth emulator.
 */

test.fixme("S-02 / T-026 — connexion valide redirige vers une page connectée", async ({ page }) => {
  await page.goto("/connexion");
  // TODO: remplir email/mdp d'un utilisateur de test, soumettre.
  // await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
  // await page.getByLabel(/mot de passe/i).fill(process.env.E2E_USER_PASSWORD!);
  // await page.getByRole("button", { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|messages)/);
});

test.fixme("S-03 / T-027 — identifiants invalides → message générique", async ({ page }) => {
  await page.goto("/connexion");
  // TODO: soumettre un mauvais mot de passe et vérifier que le message
  // ne révèle pas si l'email existe (message générique).
  await expect(page.getByText(/identifiants|incorrect|invalide/i).first()).toBeVisible();
});

test.fixme("S-04 / T-020 — inscription valide (3 étapes) crée un compte", async ({ page }) => {
  await page.goto("/inscription");
  // TODO: parcourir les 3 étapes (compte → profil santé → CGU) avec un email unique.
  // Vérifier la création du profil Firestore et la redirection.
});

test.fixme("S-05 / T-029 — reset mot de passe envoie un email", async ({ page }) => {
  await page.goto("/connexion");
  // TODO: cliquer « Mot de passe oublié ? », saisir un email, vérifier le message de confirmation.
  // La réception réelle de l'email se vérifie hors Playwright (ou via Auth emulator).
});

test("S-14 / T-033 — route protégée redirige vers /connexion", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/connexion/);
});

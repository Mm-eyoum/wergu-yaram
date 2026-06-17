import { test, expect, type Page } from "@playwright/test";

/**
 * Auth + write flows against the Firebase EMULATORS (never production).
 * Réf. cahier: docs/qa/cahier-de-tests.md — M2 (Auth) & M4-B (création de page).
 *
 * Each test registers its own fresh user through the real 3-step signup UI,
 * which (against the emulator) creates the Auth user + the patient_public
 * Firestore profile — exactly the production path, just pointed at localhost.
 */

/** Unique email per test so parallel/repeat runs never collide. */
function freshEmail(tag: string): string {
  return `e2e+${tag}.${Date.now()}@example.com`;
}

const PASSWORD = "Test1234!secure";

/** Drive the 3-step registration form to completion; lands on /dashboard. */
async function registerThroughUi(page: Page, email: string): Promise<void> {
  await page.goto("/inscription");
  // Step 1 — Compte
  await page.getByLabel("Prénom").fill("Awa");
  await page.getByLabel("Nom", { exact: true }).fill("Diop");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmer").fill(PASSWORD);
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  // Step 2 — Profil santé (region default is fine; interests optional)
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  // Step 3 — Confirmation: accept CGU then submit
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Créer mon compte/i }).click();
}

test("S-04 / T-020 — inscription 3 étapes → utilisateur connecté sur le dashboard", async ({ page }) => {
  await registerThroughUi(page, freshEmail("signup"));
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  // Une page authentifiée s'affiche (le menu/État connecté est présent).
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});

test("S-02 / T-026 — déconnexion puis reconnexion d'un compte existant", async ({ page }) => {
  const email = freshEmail("login");
  await registerThroughUi(page, email);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Connexion explicite via le formulaire (after a fresh context reload).
  await page.context().clearCookies();
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel(/Mot de passe/i).fill(PASSWORD);
  await page.getByRole("button", { name: /Se connecter/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/$/, { timeout: 15_000 });
});

test("S-15 / T-200 — un patient_public ne peut pas atteindre l'admin", async ({ page }) => {
  await registerThroughUi(page, freshEmail("guard"));
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  // Tentative d'accès direct à une route admin.
  await page.goto("/admin/users");
  // Refus attendu: pas de contenu admin (sidebar « Utilisateurs » / titre admin absents).
  await expect(page.getByText(/Accès réservé|autorisations nécessaires/i).first()).toBeVisible({
    timeout: 10_000,
  });
});

test("S-12 / T-090 — création d'une page → en attente de validation", async ({ page }) => {
  await registerThroughUi(page, freshEmail("createpage"));
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.goto("/dashboard/pages/new");
  // Type « Partenaire » (évite le sélecteur de localisation des structures).
  await page.getByRole("button", { name: /Partenaire/i }).click();
  await page.getByLabel("Nom de la page").fill("ONG Santé Test E2E");
  await page.getByLabel("Description").fill("Page de test créée par la suite E2E émulateur.");
  await page.getByRole("button", { name: /Créer la page/i }).click();

  // Toast de confirmation (statut pending) + retour dashboard.
  await expect(page.getByText(/en attente de validation/i)).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

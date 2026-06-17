import { test, expect } from "@playwright/test";

/**
 * Smoke — Don (parcours argent, le plus critique).
 * Réf. cahier: docs/qa/cahier-de-tests.md §5 (S-09, S-10, S-11) et §4 Flow A.
 *
 * BLOQUANT: nécessite un sandbox Bictorys (cf. zones d'ombre §6.3).
 * Ne PAS câbler le vrai gateway. Tant que le sandbox n'est pas confirmé,
 * ces tests restent `fixme`.
 */

test.fixme("S-10 / T-081 — les montants préréglés sont 5k→200k FCFA", async ({ page }) => {
  // TODO: ouvrir un /besoins/:id existant (seed requis) et vérifier les 6 boutons:
  // 5 000, 10 000, 25 000, 50 000, 100 000, 200 000.
  for (const amount of ["5 000", "10 000", "25 000", "50 000", "100 000", "200 000"]) {
    await expect(page.getByRole("button", { name: new RegExp(amount.replace(/\s/g, "\\s?")) })).toBeVisible();
  }
});

test.fixme("S-09 / T-080 — don bout-en-bout via sandbox Bictorys", async () => {
  // TODO (sandbox requis):
  // 1. /besoins/:id → choisir 10 000 FCFA → Wave → Donner.
  // 2. Vérifier la redirection vers le checkout Bictorys (sandbox).
  // 3. Après paiement sandbox, vérifier MAJ raisedAmount/donorsCount.
});

test.fixme("S-11 / T-085 — le webhook crédite une seule fois (idempotence)", async () => {
  // TODO: test d'intégration côté Cloud Function (hors navigateur):
  // rejouer deux fois le même webhook signé et vérifier un seul crédit.
});

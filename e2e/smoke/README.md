# Smoke E2E stubs

Squelettes Playwright pour le **smoke test** du cahier de tests
(`docs/qa/cahier-de-tests.md`, section 5). Chaque `test` est marqué
`test.fixme(...)` : il est **listé** par `npx playwright test --list` mais
**jamais exécuté** tant qu'il n'est pas implémenté — pas de faux vert, pas
d'échec en CI.

Convention : chaque test référence son ID smoke (`S-xx`) et l'ID du cahier
(`T-xxx`) dans son titre. Pour activer un test, retirer `.fixme`, remplir
les `TODO`, et fournir les fixtures d'auth/sandbox nécessaires.

Pré-requis à câbler avant activation :
- **Auth** : un utilisateur de test (`patient_public`) et un admin de test
  (storage state Playwright ou login programmatique Firebase Auth emulator).
- **Don (S-09/S-11)** : sandbox Bictorys — voir « zones d'ombre » du cahier.
  Tant qu'aucun sandbox n'est confirmé, ces tests restent `fixme`.
- **Données** : le smoke tourne contre le build de prod via `vite preview`
  (cf. `playwright.config.ts`), avec fallback mock si Firestore est vide.

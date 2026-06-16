# AUDIT QA & TESTS — Wergu Yaram

## 1. État des lieux

| Type de test | Présent ? | Détail |
|--------------|:---:|--------|
| Tests unitaires | ❌ | Aucun |
| Tests de composants | ❌ | Aucun (pas de Testing Library) |
| Tests d'intégration | ❌ | Aucun |
| Tests E2E | ❌ | Aucun (pas de Playwright/Cypress) |
| Tests d'API / règles Firestore | ❌ | Aucun (pas d'émulateur configuré) |
| Tests de permissions | ❌ | Aucun |
| Tests d'accessibilité | ❌ | Aucun (pas d'axe-core) |
| Tests de non-régression | ❌ | Aucun |

**Aucun framework de test n'est installé** (`package.json` : ni `vitest`, ni `jest`, ni `@testing-library/*`, ni `playwright`). Les seuls garde-fous automatiques sont **ESLint** et **`tsc`** (typage), qui passent tous deux.

`scripts/screenshots.mjs` existe (captures responsive) mais ce n'est **pas** un test (pas d'assertions).

**Couverture fonctionnelle : ~0 %.** → **Score QA : 8/100** (le 8 reflète la présence de lint + typecheck stricts, seuls filets actuels).

---

## 2. Matrice de couverture fonctionnelle (cible vs réel)

| Domaine | Criticité | Couvert | Cible |
|---------|:---:|:---:|:---:|
| Auth (login/register/logout/reset) | Critique | ❌ 0 % | 90 % |
| Permissions / rôles / statut | Critique | ❌ 0 % | 90 % |
| Règles Firestore | Critique | ❌ 0 % | 100 % des collections |
| Navigation / routing / ProtectedRoute | Haute | ❌ 0 % | 80 % |
| Formulaires (validation) | Haute | ❌ 0 % | 80 % |
| Recherche / filtres | Moyenne | ❌ 0 % | 60 % |
| Composants UI (Button, FormInput…) | Moyenne | ❌ 0 % | 70 % |
| Parcours (don, message, post) | Haute | ❌ 0 % | 70 % (quand implémentés) |
| Accessibilité | Moyenne | ❌ 0 % | smoke axe sur pages clés |

---

## 3. Outillage recommandé

- **Vitest** + **@testing-library/react** + **@testing-library/user-event** + **jsdom** : unitaires & composants.
- **@firebase/rules-unit-testing** + **émulateur Firestore** : tests de règles (indispensable vu SEC-01/02/04).
- **Playwright** : E2E multi-navigateurs + responsive + `@axe-core/playwright` pour l'a11y.
- **CI GitHub Actions** : `lint → typecheck → test → build` sur chaque PR.

---

## 4. Plan de tests — Règles Firestore (priorité absolue)

Avec l'émulateur, valider chaque collection :
1. `users/{uid}` : un user lit/écrit son doc ; ne lit pas celui d'un autre ; ne peut pas se mettre `role:admin` à la création ni en update ; un admin lit tout.
2. `medications`/`pathologies`/… : lecture publique OK ; écriture refusée à un non-admin ; acceptée à un admin.
3. `communities/{c}/posts` : create refusé si non connecté ; **(après fix SEC-01)** create refusé si `authorUid != auth.uid` ; update/delete réservés à l'auteur/admin.
4. `forumThreads` : idem posts.
5. `conversations` : un non-participant ne lit pas ; un participant lit/écrit ; create impose l'auteur dans `participants`.
6. Fallback : tout chemin non déclaré est refusé.

---

## 5. Plan de tests E2E (Playwright) — par parcours

1. **Visiteur** : home → recherche « diabète » → ouvre une pathologie → voit l'`EmptyState` sur slug inexistant.
2. **Inscription patient** : remplit les 3 étapes → validations (mdp court, mots de passe différents) → création → redirection `/dashboard`.
3. **Connexion / déconnexion** : login OK ; mauvais mdp → message ; logout (desktop **et** mobile une fois FE-03 corrigé).
4. **Route protégée** : accès `/dashboard` non connecté → redirige vers `/connexion` avec retour après login.
5. **Rôle `pending`** (après RP-01) : structure → écran « compte en attente », actions sensibles bloquées.
6. **Forum/Communauté** (après câblage) : poser une question / publier / rejoindre → persistance vérifiée après reload.
7. **Don** (après C5) : sélection montant/méthode → paiement test → collecte mise à jour.
8. **Messagerie** (après câblage) : envoyer un message → apparaît dans le fil → persiste après reload.
9. **Admin** (après RP-02) : valider un compte `pending` → l'utilisateur passe `active`.

---

## 6. Plan de tests composants/unitaires

- `RoleSelector` : n'expose jamais `admin`.
- `defaultStatusForRole` : patient→active, autres→pending.
- `ProtectedRoute` : loading / non-auth (redirect) / auth (rendu) ; variante future `requireRole`.
- `FormInput` : affiche label, erreur, `aria` ; associe `id`/`htmlFor`.
- `Button`/`ButtonLink` : variantes, `disabled`, rendu `<a>` vs `<button>`.
- `useDebounce` : déclenche après le délai.
- `format.ts` : `formatFcfa`, `percent`, dates FR.
- Recherche (`content.searchContent`) : pertinence, scoping par type, casse.

---

## 7. Scénarios de non-régression critiques

- L'inscription ne doit **jamais** permettre `role:admin`.
- `ProtectedRoute` ne doit **jamais** rendre son contenu sans `user`.
- Les règles Firestore ne doivent **jamais** autoriser un write non-admin sur le contenu public.
- Après fix SEC-01 : impossible de créer un post avec un `authorUid` d'autrui.

---

## 8. Priorités QA

| Priorité | Action |
|----------|--------|
| **P0** | Installer Vitest + Testing Library + rules-unit-testing ; CI lint/typecheck/test/build |
| **P1** | Tests de règles Firestore (toutes collections) ; tests auth & ProtectedRoute |
| **P1** | E2E inscription/connexion/route protégée |
| **P2** | Tests composants (RoleSelector, FormInput, Button) ; E2E des parcours au fur et à mesure de leur câblage |
| **P3** | Smoke a11y (axe) sur 5 pages clés ; non-régression visuelle (screenshots) |

**Score QA/tests : 8/100.** Aucune couverture de test ; seuls lint et typecheck protègent le code. C'est le domaine le plus faible de l'audit et un **prérequis P0** avant d'entamer la migration back-end (la plus risquée).

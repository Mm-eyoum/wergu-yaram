# AUDIT GLOBAL — Wergu Yaram

> Audit technique, fonctionnel, UI/UX, sécurité, performance et architecture.
> Date : 15 juin 2026 · Méthode : analyse statique du code + vérifications automatisées (lint, typecheck, build, npm audit).
> Périmètre : intégralité du dépôt `/Users/macbookair/Wergu Yaram` (branche `main`).

---

## 1. Résumé exécutif

**Wergu Yaram** est un portail santé pour le Sénégal : information médicale (médicaments, pathologies, articles), annuaire d'établissements, communautés, forum, financement participatif d'équipements médicaux, événements et messagerie privée.

La plateforme est une **application React (Vite) mono-page**, sans serveur applicatif propre, adossée à **Firebase** (Auth + Firestore). Le travail front-end est **soigné et cohérent** (design system maison, code typé strict, build propre, découpage en lazy-loading). En revanche, le constat central est sans ambiguïté :

> **La plateforme est aujourd'hui une maquette haute-fidélité (« vitrine ») et non un produit fonctionnel.** L'essentiel du contenu provient de **données fictives codées en dur** (`src/data/mock*.ts`), et la majorité des actions utilisateur (publier un post, poser une question, envoyer un message, faire un don, rejoindre une communauté, proposer un partenariat) **ne sont reliées à aucun back-end** — elles donnent une fausse impression de fonctionner.

Seuls **l'authentification et le profil utilisateur** sont réellement persistés (Firestore `users/{uid}`). Tout le reste est de l'affichage.

**Conséquence produit** : en l'état, un utilisateur peut s'inscrire et se connecter, mais aucune des promesses fonctionnelles (communauté, forum, dons, messagerie) n'est opérante. Le risque principal n'est pas la sécurité des données (peu de données réelles circulent) mais la **crédibilité** : livrer cet état en production tromperait les utilisateurs.

**État de préparation production : NON.** Chantier de connexion back-end significatif requis.

### Vérifications automatisées exécutées

| Commande | Résultat |
|----------|----------|
| `npm run lint` | ✅ 0 erreur, **1 warning** (`react-refresh` sur `AuthContext.tsx:42`) |
| `npm run typecheck` (`tsc --noEmit`) | ✅ Aucune erreur de type |
| `npm run build` | ✅ Build OK en ~2,1 s. Chunk le plus lourd : `firebase` **442 kB (103 kB gzip)** |
| `npm audit` | ⚠️ **12 vulnérabilités** (9 modérées, 3 hautes), toutes via `undici` transitif de Firebase 10.13 |
| Recherche `TODO/FIXME/HACK` | ✅ Aucune |
| Recherche `console.*` | ✅ Aucune en code applicatif (`src/`) ; présentes uniquement dans `scripts/` (acceptable) |
| `git ls-files` (secrets) | ✅ `.env.local` **non suivi** par git (seul `.env.example` l'est) |

---

## 2. Scores par domaine

| Domaine | Score /100 | Niveau |
|---------|:---:|--------|
| Architecture | 70 | Moyen-bon |
| Front-end | 62 | Moyen |
| Back-end | 42 | Fragile |
| UI/UX | 68 | Moyen-bon |
| Responsive | 78 | Bon |
| Accessibilité | 64 | Moyen |
| Sécurité | 55 | Fragile |
| Performance | 80 | Bon |
| QA / Tests | 8 | Critique |
| Maintenabilité | 72 | Bon |
| Cohérence produit | 40 | Fragile |

### Score global : **58 / 100** — *Fragile : refactoring/complétion nécessaire avant production.*

**Justification du score global.** La note est tirée vers le bas par trois domaines : l'absence totale de tests (8/100), l'incohérence produit majeure entre l'apparence et le réel (40/100), et un back-end embryonnaire (42/100). À l'inverse, la qualité du code front (typage strict, build propre, design system cohérent) et la performance (bundles légers, lazy-loading) sont de bon niveau. Le projet est une **base technique saine mais inachevée** : le squelette est de qualité, mais le « câblage » fonctionnel et les garde-fous (tests, sécurité applicative, intégrations) restent à construire. Ce n'est pas un produit à durcir, c'est une maquette à finir de brancher.

---

## 3. Top 10 des risques

| # | Risque | Gravité | Réf. rapport |
|---|--------|:---:|---|
| R1 | **Plateforme « vitrine »** : la quasi-totalité du contenu est mock ; les actions clés ne persistent rien | Critique | DATA_FLOW, PRODUIT |
| R2 | **Aucun test automatisé** (0 % de couverture) : toute régression passe inaperçue | Critique | QA_TESTS |
| R3 | **Impersonation Firestore** : `create` de posts/threads ne vérifie pas `authorUid == auth.uid` (`firestore.rules:51,58`) | Haute | SECURITY |
| R4 | **12 vulnérabilités de dépendances** (3 hautes) via Firebase/undici non à jour | Haute | SECURITY, PERFORMANCE |
| R5 | **Aucune UI d'administration** alors que le modèle prévoit des comptes `pending` à valider et des rôles admin | Haute | ROLES_PERMISSIONS |
| R6 | **Statut `pending`/`suspended` sans effet** : un compte non validé ou suspendu a exactement les mêmes droits qu'un compte actif | Haute | ROLES_PERMISSIONS |
| R7 | **Type `Conversation` incomplet** (pas de `participants`) alors que les règles Firestore l'exigent → la messagerie réelle ne fonctionnerait pas | Moyenne | BACKEND, DATA_FLOW |
| R8 | **Modèles sans `authorUid`** (`CommunityPost`, `ForumThread`) → impossible d'appliquer la propriété côté règles | Moyenne | BACKEND, SECURITY |
| R9 | **Premier admin non provisionné** (problème œuf/poule avec les règles) ; `seed.ts` utilise le SDK client | Moyenne | SECURITY, BACKEND |
| R10 | **Pas de bouton de déconnexion sur mobile** + redirections muettes : parcours connectés frustrants | Moyenne | FRONTEND, UI_UX |

---

## 4. Top 10 des quick wins

| # | Quick win | Effort | Réf. |
|---|-----------|:---:|---|
| Q1 | Corriger les règles Firestore (`authorUid == request.auth.uid` sur les `create`) | Faible | SECURITY |
| Q2 | Ajouter le bouton **Déconnexion** dans le drawer mobile (`AppHeader.tsx`) | Faible | FRONTEND |
| Q3 | Désactiver/masquer ou afficher un toast « Bientôt disponible » sur les boutons non câblés (Forum, Communauté, Partenaires, Don, Messages) | Faible | UI_UX |
| Q4 | Remplacer le lien CGU `href="#"` (`Register.tsx:209`) par une vraie route ou désactiver | Faible | FRONTEND, A11Y |
| Q5 | Supprimer le champ `phone` mort de l'inscription, ou le persister (`Register.tsx:25,144`) | Faible | FRONTEND |
| Q6 | Ajouter `react-refresh` fix : sortir `AuthProvider`/contexte du même fichier d'export (warning lint) | Faible | QUALITÉ |
| Q7 | Compléter le type `Conversation` avec `participants: string[]` | Faible | BACKEND |
| Q8 | Ajouter `authorUid` aux types `CommunityPost` et `ForumThread` | Faible | BACKEND |
| Q9 | Documenter la création du premier admin (README + script Admin SDK) | Faible | SECURITY |
| Q10 | Aligner le montant minimum de don (custom `min=500` vs presets `5000`) (`DonationWidget.tsx`) | Faible | UI_UX |

---

## 5. Top 10 des chantiers prioritaires

| # | Chantier | Effort | Impact |
|---|----------|:---:|:---:|
| C1 | **Brancher le contenu sur Firestore** (médicaments, pathologies, communautés, forum, besoins, événements) en remplaçant la façade mock par de vraies lectures | Élevé | Critique |
| C2 | **Implémenter les écritures réelles** : posts communauté, threads forum, messages, dons | Élevé | Critique |
| C3 | **Mettre en place une suite de tests** (Vitest + Testing Library + un harnais e2e Playwright) en commençant par auth & permissions | Élevé | Critique |
| C4 | **Construire un back-office admin** : validation des comptes `pending`, modération, gestion de contenu | Élevé | Haut |
| C5 | **Intégrer un vrai paiement** (Wave / Mobile Money / carte) pour les dons, avec webhook de confirmation | Élevé | Haut |
| C6 | **Durcir la sécurité Firestore** (impersonation, validation des champs, participants messagerie) + tests de règles via l'émulateur | Moyen | Haut |
| C7 | **Mettre à jour Firebase** pour résorber les 12 vulnérabilités | Faible | Moyen |
| C8 | **Appliquer les permissions par rôle/statut** côté front (et back) : effets réels de `pending`/`suspended` | Moyen | Haut |
| C9 | **Introduire une couche data robuste** (TanStack Query) : loading/error/empty, cache, invalidation après mutation | Moyen | Haut |
| C10 | **Accessibilité & i18n** : audit WCAG (contrastes, skip-link, focus), externalisation des chaînes FR | Moyen | Moyen |

---

## 6. Liste des rapports détaillés

| Fichier | Contenu |
|---------|---------|
| `AUDIT_GLOBAL.md` | Ce document — synthèse, scores, top risques/quick wins/chantiers |
| `AUDIT_ARCHITECTURE.md` | Cartographie, forces/faiblesses, refactorings |
| `AUDIT_FRONTEND.md` | Pages, composants, boutons/actions, liens, responsive, a11y |
| `AUDIT_BACKEND.md` | Firestore, services, modèles, validation, permissions |
| `AUDIT_ROLES_PERMISSIONS.md` | Matrices rôles × routes / fonctionnalités / permissions |
| `AUDIT_DATA_FLOW.md` | Flux front→back, mock vs réel, mutations non persistées |
| `AUDIT_UI_UX.md` | Analyse écran par écran, notes UI/UX, quick wins, refontes |
| `AUDIT_SECURITY.md` | Registre OWASP, règles Firestore, secrets, IDOR, dépendances |
| `AUDIT_PERFORMANCE.md` | Bundle, code splitting, Core Web Vitals estimés |
| `AUDIT_ACCESSIBILITY.md` | WCAG : contrastes, clavier, ARIA, sémantique |
| `AUDIT_QA_TESTS.md` | Couverture, plans e2e/API/par rôle |
| `ROADMAP_CORRECTION.md` | Plan 30/60/90 jours, effort/impact/priorité |

---

## 7. Limites de l'audit

- **Audit statique** : analyse du code source, de la configuration et des sorties de build/lint/typecheck/audit. **Aucune exécution e2e réelle dans un navigateur** ni test d'intrusion.
- **Firestore non inspecté à l'exécution** : les règles sont analysées telles qu'écrites dans `firestore.rules` ; l'état réel du projet Firebase `werguyaram` (données, comptes, rules déployées) n'a pas été interrogé.
- **Responsive & contrastes** estimés par lecture du code Tailwind, non mesurés sur device réel ni avec un outil de contraste.
- **Core Web Vitals** estimés à partir de la taille des bundles, non mesurés (pas de Lighthouse exécuté).
- Les **scores** sont des appréciations d'expert argumentées, pas des métriques absolues.

# ROADMAP DE CORRECTION — Wergu Yaram

> Plan d'action priorisé en 3 horizons (30 / 60 / 90 jours). Estimations en jours-homme (J/H) indicatives pour 1–2 développeurs. Légende priorité : P0 (bloquant) · P1 (critique) · P2 (important) · P3 (confort).

## Principe directeur

Le produit est une **maquette haute-fidélité**. La trajectoire de correction n'est pas « durcir un produit existant » mais **« brancher le réel sans casser la maquette »**. L'ordre impose donc : (1) filet de sécurité (tests + sécurité des règles), (2) honnêteté UX (neutraliser le faux-fonctionnel), (3) câblage back-end progressif, (4) fonctionnalités à forte valeur (admin, dons, messagerie).

---

## PHASE 30 JOURS — Fondations & honnêteté (P0/P1)

Objectif : sécuriser, rendre testable, et **arrêter de tromper l'utilisateur**.

| # | Action | Réf. | Prio | Effort | Impact |
|---|--------|------|:---:|:---:|:---:|
| 1 | Installer Vitest + Testing Library + `@firebase/rules-unit-testing` + CI (lint/typecheck/test/build) | QA P0 | P0 | 3 J/H | Critique |
| 2 | Corriger règles Firestore : `authorUid == auth.uid` sur posts/threads | SEC-01 | P1 | 0,5 J/H | Haut |
| 3 | Ajouter validation de forme (`hasOnly`, types) sur posts/threads/conversations | SEC-02 | P1 | 2 J/H | Haut |
| 4 | Tests de règles Firestore (toutes collections) | QA | P1 | 3 J/H | Haut |
| 5 | Mettre à jour Firebase (résorber 12 vulnérabilités) + retester auth/build | SEC-03 | P1 | 1 J/H | Moyen |
| 6 | Neutraliser les boutons morts (disable + toast « Bientôt disponible ») | FE-01/02 | P1 | 1 J/H | Haut (confiance) |
| 7 | Retirer mentions trompeuses (don « sécurisé », messagerie « confidentielle ») tant que non câblées | UI_UX | P1 | 0,5 J/H | Haut |
| 8 | Quick wins front : déconnexion mobile, page CGU, champ téléphone, montant min don | FE-03/04, A11Y-01 | P2 | 1 J/H | Moyen |
| 9 | Aligner modèles ↔ règles : `authorUid`, `participants` | BE-01 | P1 | 0,5 J/H | Haut |
| 10 | Fix warning lint (extraire contexte d'auth) | QUALITÉ | P3 | 0,5 J/H | Faible |

**Total ~13 J/H.** Livrable : base sécurisée, testable, sans fonctionnalités trompeuses.

---

## PHASE 60 JOURS — Câblage back-end du contenu (P1)

Objectif : remplacer le mock par Firestore, écran par écran, sous protection des tests.

| # | Action | Réf. | Prio | Effort | Impact |
|---|--------|------|:---:|:---:|:---:|
| 11 | Introduire la couche d'accès **asynchrone** dans `services/` (mock OU Firestore via flag) | ARCHI A-01 | P1 | 3 J/H | Critique |
| 12 | Adopter **TanStack Query** (loading/error/empty, cache, invalidation) | ARCHI/DF | P1 | 2 J/H | Haut |
| 13 | Brancher le contenu **lecture** sur Firestore (médicaments, pathologies, articles, établissements, communautés, besoins, événements, partenaires) | DF-02 | P1 | 6 J/H | Critique |
| 14 | Migrer `seed.ts` vers **Admin SDK** + script `set-admin` + doc README | SEC-06 | P2 | 2 J/H | Moyen |
| 15 | Pagination des listes (forum, besoins, recherche) + index Firestore | BE/PERF-03 | P2 | 3 J/H | Haut |
| 16 | États loading/error/empty réels sur toutes les pages migrées | DF-03 | P1 | 2 J/H | Haut |
| 17 | E2E parcours visiteur + auth + route protégée | QA | P1 | 2 J/H | Haut |
| 18 | Rendre le **statut effectif** (front pending/suspended + règles `status=='active'`) | RP-01 | P1 | 2 J/H | Haut |

**Total ~22 J/H.** Livrable : contenu réellement administrable et servi depuis la base, parcours de lecture testés.

---

## PHASE 90 JOURS — Fonctionnalités à valeur & gouvernance (P1/P2)

Objectif : livrer les fonctionnalités d'engagement et le back-office.

| # | Action | Réf. | Prio | Effort | Impact |
|---|--------|------|:---:|:---:|:---:|
| 19 | **Écritures réelles** : posts communauté, threads forum, adhésion communauté | FE-01, DF-01 | P1 | 5 J/H | Haut |
| 20 | **Messagerie Firestore** temps réel (`onSnapshot`) + modèle `participants` | DF-01, BE-01 | P1 | 5 J/H | Haut |
| 21 | **Paiement des dons** (Wave / Mobile Money / carte) + webhook + MAJ collecte + reçu | C5 | P1 | 8 J/H | Haut |
| 22 | **Back-office admin** : validation comptes `pending`, modération, gestion contenu | RP-02 | P1 | 8 J/H | Haut |
| 23 | Dashboards différenciés par rôle (données réelles) | RP-03 | P2 | 4 J/H | Moyen |
| 24 | App Check + anti-abus + logging d'erreurs (Sentry/Crashlytics) | SEC-07/08 | P2 | 3 J/H | Moyen |
| 25 | Accessibilité AA : skip-link, contrastes, focus menus, `aria-live` | A11Y | P2 | 3 J/H | Moyen |
| 26 | Dynamic import Firestore + optimisation police (perf) | PERF-01/02 | P2 | 2 J/H | Moyen |
| 27 | E2E des parcours câblés (don, message, post, admin) + smoke a11y | QA | P1 | 3 J/H | Haut |

**Total ~41 J/H.** Livrable : produit fonctionnel de bout en bout, administrable, sécurisé et testé.

---

## Quick wins (à faire immédiatement — < 1 J/H chacun)

1. Règles `authorUid` (SEC-01).
2. Déconnexion mobile (FE-03).
3. Neutraliser boutons morts + retirer mentions trompeuses (FE-01, UI_UX).
4. Page/route CGU au lieu de `href="#"` (A11Y-01).
5. Champ téléphone (persister ou retirer) (FE-04).
6. Montant min don aligné (UI_UX).
7. Fix warning lint (QUALITÉ).
8. `npm update firebase` (SEC-03) avec retest.

## Corrections critiques (à ne pas reporter)

- Tests + CI (sinon la migration cassera silencieusement).
- Sécurité des règles (impersonation, validation de forme).
- Statut `pending`/`suspended` effectif.
- Honnêteté UX (ne pas livrer de faux paiement/faux envoi en production).

## Synthèse effort / impact

| Phase | Effort | Impact dominant |
|-------|:---:|-----------------|
| 30 j | ~13 J/H | Sécurité + confiance + testabilité |
| 60 j | ~22 J/H | Vrai back-end (lecture) + perf |
| 90 j | ~41 J/H | Fonctionnalités + gouvernance |
| **Total** | **~76 J/H** | Maquette → produit |

## Dette technique transverse à résorber

- Double source de vérité contenu (mock vs Firestore) → supprimer le mock une fois la migration faite.
- `catch {}` muets → logging.
- Logique d'accès dans `data/` → déménager dans `services/`.
- Composants `Toast`/`Modal` accessibles manquants → créer.

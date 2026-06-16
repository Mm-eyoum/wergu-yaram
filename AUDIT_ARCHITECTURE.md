# AUDIT ARCHITECTURE — Wergu Yaram

## 1. Cartographie de l'architecture

### Stack

- **Front** : React 18.3 + TypeScript 5.6 (mode strict), Vite 5.4, React Router 6.26.
- **UI** : Tailwind CSS 3.4 + design system maison (`src/components/ui`), icônes `lucide-react`, `clsx` + `tailwind-merge` (`src/lib/cn.ts`).
- **Back** : Firebase 10.13 — Auth (email/password + Google) + Cloud Firestore. **Pas de serveur applicatif** (pas d'API REST/GraphQL custom, pas de Cloud Functions).
- **Données** : majoritairement **mock en dur** (`src/data/mock*.ts`) ; seul `users/{uid}` est persisté en Firestore.
- **Outillage** : ESLint, `tsc`, Vite build. **Aucun framework de test.**

### Diagramme textuel des modules

```
main.tsx
 └─ <BrowserRouter>
     └─ <AuthProvider>  (src/context/AuthContext.tsx)  ── écoute onAuthStateChanged
         └─ <App>  (src/App.tsx)  ── routing + choix de layout
             ├─ AppShell (header/footer)         ── pages publiques
             │   └─ AppHeader / AppFooter
             └─ AuthLayout                        ── /connexion, /inscription

  Pages (18, lazy)  ──lisent──>  services/content.ts  ──ré-exporte──>  data/mock*.ts   (CONTENU FICTIF)
        │
        └─ useAuth() ─> AuthContext ─> services/users.ts ─> services/firebase.ts ─> Firestore users/{uid}   (RÉEL)

  Couches transverses :
   - lib/        cn.ts (classes), format.ts (FCFA/dates), constants.ts (nav, régions, rôles, dons)
   - hooks/      useAuth.ts, useDebounce.ts
   - types/      domain.ts (tous les modèles)
   - components/ ui · layout · cards · search · auth · community · dashboard · equipment · health
```

### Découpage des dossiers (`src/`)

| Dossier | Rôle | Appréciation |
|---------|------|--------------|
| `pages/` | 18 pages (1 par route), lazy-loadées | ✅ Clair, 1 fichier = 1 écran |
| `components/` | 9 sous-dossiers thématiques (ui, layout, cards, search, auth, community, dashboard, equipment, health) | ✅ Très bien rangé |
| `context/` | `AuthContext` (état global d'auth) | ✅ |
| `hooks/` | `useAuth`, `useDebounce` | ✅ |
| `lib/` | utilitaires purs | ✅ |
| `services/` | `firebase`, `users`, `content` (façade données) | ⚠️ `content` ré-exporte du mock |
| `data/` | 11 fichiers de données fictives | ⚠️ Mélange données et logique d'accès (`xBySlug`) |
| `types/` | `domain.ts` — source de vérité des modèles | ✅ |
| `scripts/` | `seed.ts`, `screenshots.mjs` | ⚠️ `seed` en SDK client |

---

## 2. Forces

1. **Séparation des responsabilités globalement saine** : UI (`components`), écrans (`pages`), accès données (`services`), état (`context`), utilitaires (`lib`), modèles (`types`). Le code métier n'est pas noyé dans le JSX.
2. **Façade de données** : `services/content.ts` centralise l'accès au contenu. C'est le **bon point d'extension** pour basculer mock → Firestore sans toucher aux pages (cf. AUDIT_DATA_FLOW).
3. **Typage strict et cohérent** : `domain.ts` est l'unique source des modèles, importée partout. `tsc --noEmit` passe sans erreur.
4. **Routing lisible** : table de routes plate dans `App.tsx`, lazy-loading systématique, layout conditionnel propre (auth vs reste).
5. **Design system réel** : primitives réutilisables (`Button`, `Badge`, `Card`, `FormInput`, `Tabs`, `EmptyState`, `LoadingState`…) + tokens Tailwind (`tailwind.config.ts`). Faible duplication visuelle.
6. **Aliasing `@/`** configuré (Vite + tsconfig) : imports propres.
7. **Découpage du bundle** explicite (`vite.config.ts` : chunks `react` et `firebase`).

---

## 3. Faiblesses

| ID | Faiblesse | Détail |
|----|-----------|--------|
| A-01 | **Pas de vraie couche d'accès aux données** | `content.ts` ré-exporte des tableaux statiques. Aucune abstraction asynchrone (tout est synchrone), donc passer à Firestore imposera de réécrire la signature de toutes les pages (sync → async). |
| A-02 | **Double source de vérité du contenu** | Le contenu existe en mock (`data/`) ET est censé exister en Firestore (`seed.ts`, `firestore.rules`). Rien ne garantit leur cohérence ; aucune n'est réellement utilisée par l'app. |
| A-03 | **Absence de gestion d'état asynchrone** | Pas de TanStack Query/SWR : aucun cache, pas d'invalidation, pas d'états loading/error standardisés pour les données. |
| A-04 | **Logique d'accès mêlée aux données** | Les helpers `medicationBySlug`, `equipmentNeedById`… vivent dans les fichiers de mock. À la migration, cette logique devra déménager dans `services/`. |
| A-05 | **Incohérences modèle ↔ règles** | `Conversation` n'a pas de `participants` (exigé par `firestore.rules:65`) ; `CommunityPost`/`ForumThread` n'ont pas d'`authorUid` (exigé par `firestore.rules:52,59`). L'architecture data n'est pas alignée avec l'architecture sécurité. |
| A-06 | **Pas de couche d'erreurs / logging** | Les `catch {}` avalent les erreurs (ex. `AuthContext.tsx:57`, `Login.tsx:36`). Aucun reporting (Sentry/Crashlytics). |
| A-07 | **Aucune frontière de test** | Pas de tests → l'architecture n'est pas protégée contre les régressions lors de la future migration back-end (la plus risquée). |
| A-08 | **Pas de séparation env/config applicative** | La config (rôles, paiements, régions) est en dur dans `constants.ts` ; acceptable à ce stade mais à externaliser si multi-pays. |

---

## 4. Risques architecturaux

- **Migration mock → Firestore = risque majeur.** Comme tout le contenu est consommé de façon **synchrone**, brancher Firestore (asynchrone) touchera **les 18 pages**. Sans tests (A-07), cette migration sera fragile. → *Recommandation : introduire la couche async AVANT la migration, page par page.*
- **Dérive de cohérence des modèles.** Les écarts modèle/règles (A-05) signifient que la messagerie et la modération « réelles » ne fonctionneront pas tant que les types ne sont pas alignés.
- **Scalabilité du contenu.** Servir le contenu depuis le bundle JS (mock) ne passe pas à l'échelle ; Firestore impose pagination et index (absents aujourd'hui).

---

## 5. Refactorings recommandés (priorisés)

1. **(P1) Introduire une couche d'accès asynchrone** dans `services/` (ex. `getMedications(): Promise<Medication[]>`) qui encapsule mock OU Firestore via un flag, et rendre les pages `async`/Suspense-ready. *Point d'ancrage idéal : `content.ts`.*
2. **(P1) Aligner `types/domain.ts` avec `firestore.rules`** : ajouter `authorUid` (posts/threads), `participants: string[]` (Conversation), `createdAt`/`updatedAt` serveur.
3. **(P1) Adopter TanStack Query** pour standardiser loading/error/empty, cache et invalidation post-mutation.
4. **(P2) Déplacer la logique d'accès** (`xBySlug`, `xById`) des fichiers `data/` vers `services/`.
5. **(P2) Centraliser la gestion d'erreurs** : un wrapper `safeAsync` + un service de logging ; supprimer les `catch {}` muets.
6. **(P2) Extraire le contexte d'auth** : déplacer `AuthContext`/types hors du fichier exportant `AuthProvider` (résout le warning `react-refresh`, `AuthContext.tsx:42`).
7. **(P3) Mettre en place une CI** (lint + typecheck + tests + build) avant toute reprise du chantier back-end.

---

## 6. Conventions & lisibilité

- **Nommage** cohérent (PascalCase composants, camelCase fonctions, slugs FR pour les routes). ✅
- **Taille des fichiers** raisonnable : les plus gros sont `Register.tsx` (~237 l.), `AppHeader.tsx` (~162 l.), `UniversalSearchBar.tsx` (~155 l.) — aucun fichier monstre. ✅
- **Duplication** faible grâce au design system. ✅
- **Anti-patterns** : peu nombreux ; principal souci = données fictives traitées comme une couche d'API (`content.ts`).

**Score architecture : 70/100.** Structure modulaire claire, typage strict, design system réel et façade de données bien placée constituent une base saine. La note est plafonnée par l'absence de couche d'accès asynchrone, la double source de vérité du contenu, les incohérences modèle/règles et l'absence de tests qui rendront risquée la migration vers un vrai back-end.

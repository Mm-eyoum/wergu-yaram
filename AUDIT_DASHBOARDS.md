# AUDIT DASHBOARDS — Wergu Yaram

> Audit ciblé **dashboards / espaces privés par rôle**, complémentaire aux audits globaux (`AUDIT_GLOBAL.md`, `AUDIT_FRONTEND.md`, `AUDIT_ROLES_PERMISSIONS.md`, `AUDIT_DATA_FLOW.md`).
> Date : 15 juin 2026 · Méthode : analyse statique du code + lecture des règles Firestore. Périmètre : `/dashboard`, `/messages`, et les dashboards par rôle **à construire**.
> Objectif : produire le **backlog exécutable** de la mise en opérationnalité totale, sur la base du **modèle de rôles corrigé** (voir §1).

---

## 1. Modèle de rôles & pages — cible confirmée

Le modèle actuel (« choisis ton rôle à l'inscription ») est **abandonné** au profit du modèle **Facebook/LinkedIn Pages** :

| Concept | Valeurs | Nature |
|---------|---------|--------|
| **Rôle de compte** (une personne) | `patient_public` (base) · `admin` · `super_admin` | Stocké dans `users/{uid}.role` |
| **Super-admin** | `max.eyoum@eyone.net` | Distinct, au-dessus de `admin` : valide, modère **+ promeut/révoque les admins**. Non rétrogradable. Provisionné par seed (Admin SDK). |
| **Page / Organisation** | `healthcare_facility` · `partner` · `partner_donor` | **Créée par un `patient_public`**, `status: pending` → validée par un admin → `active`. Un user peut posséder plusieurs pages. |

**Conséquences sur les dashboards :**
- Tout compte = patient. Il dispose du **dashboard patient** (`/dashboard`).
- S'il crée une page, il obtient un **dashboard de gestion de page** (scoped owner/managers).
- `admin`/`super_admin` disposent du **back-office** (`/admin`), inexistant aujourd'hui.

### Matrice d'accès — actuel vs cible

| Route | Visiteur | patient_public | Owner de page | admin | super_admin |
|-------|:--------:|:--------------:|:-------------:|:-----:|:-----------:|
| `/dashboard` | 🚫 | ✅ | ✅ | ✅ | ✅ |
| `/messages` | 🚫 | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/pages/new` *(à créer)* | 🚫 | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/pages/:id` *(à créer)* | 🚫 | 🚫 | ✅ (sa page) | ✅ | ✅ |
| `/admin` *(à créer)* | 🚫 | 🚫 | 🚫 | ✅ | ✅ |
| `/admin` → gestion des admins *(à créer)* | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |

> **État actuel** : seules `/dashboard` et `/messages` existent, protégées **uniquement par l'authentification** ([ProtectedRoute.tsx](src/components/layout/ProtectedRoute.tsx)) — **aucune notion de rôle**. Tout le reste de la matrice est à construire.

---

## 2. Carte des connexions Firebase — actuel vs cible

| Surface | Collection / opération **actuelle** | Cible |
|---------|--------------------------------------|-------|
| `/dashboard` — stats & cartes | **Aucune** : constantes en dur + tableaux mock (`@/services/content`) | `users/{uid}/favorites`, `/savedSearches`, `/reminders`, `communityMemberships` (read, owner-only) |
| `/dashboard` — « Mes pages » | **N'existe pas** | `organizations where ownerUid == uid` (read) |
| `/messages` | **Aucune** : `conversations` mock, envoi non persisté | `conversations` + `conversations/{id}/messages` (read/create, participants) |
| Profil | `users/{uid}` (read au login) | `users/{uid}` (read/update profil) |
| `/admin` validation pages | **N'existe pas** | `organizations where status == 'pending'` (read), `update status` (admin) |
| `/admin` gestion users/admins | **N'existe pas** | `users` (read/update ; `role` → admin réservé super_admin) |

### Désalignement structurel critique (règles ⇄ types ⇄ code)
Les `firestore.rules` **déclarent déjà** un graphe de collections que **ni les types ni le code n'utilisent** :

| Règle existante | Champ exigé par la règle | Présent dans `domain.ts` ? | Lu/écrit par le code ? |
|-----------------|--------------------------|:--:|:--:|
| `communities/{c}/posts` update/delete ([firestore.rules:52](firestore.rules#L52)) | `resource.data.authorUid` | ❌ (`CommunityPost` n'a pas `authorUid`) | ❌ |
| `forumThreads` update/delete ([firestore.rules:59](firestore.rules#L59)) | `resource.data.authorUid` | ❌ (`ForumThread` n'a pas `authorUid`) | ❌ |
| `conversations` read/write ([firestore.rules:64-67](firestore.rules#L64-L67)) | `resource.data.participants` | ❌ (`Conversation` n'a pas `participants`) | ❌ |
| `organizations/{id}` *(à créer)* | `ownerUid`, `status` | ❌ (pas de type `Organization`) | ❌ |

> En l'état, même si on branchait la messagerie ou le forum, **les écritures échoueraient** (`PERMISSION_DENIED`) car les documents n'ont pas les champs que les règles exigent. **C'est la première chose à corriger (Phase 1).**

---

## 3. Audit page par page

### 3.1 — `/dashboard` (patient_public) — [Dashboard.tsx](src/pages/Dashboard.tsx)

```
╔══════════════════════════════════════════════════════════════════╗
║ PAGE : /dashboard            RÔLE : patient_public                ║
║ STATUS : ❌ Maquette — 0 donnée réelle, plusieurs bloquants       ║
╠══════════════════════════════════════════════════════════════════╣
║ RENDU :        ✅ S'affiche, layout 2 colonnes correct            ║
║ FETCH :        ❌ Aucun fetch : tout est constante/mock           ║
║ BOUTONS :      ⚠️ Liens OK ; aucune action (favori, rappel…)      ║
║ FORMULAIRES :  — (aucun)                                          ║
║ FIREBASE :     ❌ Aucune lecture per-user                          ║
║ LIEN PUBLIC :  ⚠️ Liens « Tout voir » OK, pas de sync de données  ║
║ RESPONSIVE :   ✅ grid lg:[280px_1fr] → empilé < lg               ║
║ PERMISSIONS :  ⚠️ Auth OK, mais affiche les mêmes data pour tous  ║
╚══════════════════════════════════════════════════════════════════╝
```

**Problèmes :**
- 🔴 **[BLOQUANT] Données mensongères en dur.** Les compteurs sont des littéraux : `value={8}` (Favoris), `value={2}` (Communautés), `value={3}` (Rappels) — [Dashboard.tsx:48-50](src/pages/Dashboard.tsx#L48-L50) — et `SAVED_SEARCHES` est une constante de fichier ([Dashboard.tsx:31](src/pages/Dashboard.tsx#L31)). Identiques pour **tous** les utilisateurs.
- 🔴 **[BLOQUANT] Aucune donnée per-user.** Médicaments/établissements/communautés viennent de `medications.slice(0,2)` etc. ([Dashboard.tsx:97-117](src/pages/Dashboard.tsx#L97-L117)) — pas les favoris du user. Notifications « Dr Fatou Diop vous a envoyé un message » sont **codées en dur** ([Dashboard.tsx:129-138](src/pages/Dashboard.tsx#L129-L138)).
- 🟡 **[FONCTIONNEL] Aucun loading / error / empty state** (aucun fetch → rien à gérer aujourd'hui, mais à intégrer dès le branchement Firestore).
- 🟡 **[FONCTIONNEL] Pas de section « Mes pages »** ni d'entrée « Créer une page » (cœur du nouveau modèle).
- 🟢 **[VISUEL] `firstName` fallback** « à vous » → « Bonjour à vous 👋 » correct mais perfectible.

### 3.2 — `/messages` (patient_public) — [Messages.tsx](src/pages/Messages.tsx)

```
╔══════════════════════════════════════════════════════════════════╗
║ PAGE : /messages            RÔLE : patient_public                 ║
║ STATUS : ❌ Factice — l'envoi ne persiste rien                    ║
╠══════════════════════════════════════════════════════════════════╣
║ RENDU :        ✅ Layout 3 colonnes soigné                        ║
║ FETCH :        ❌ `conversations` mock, lecture synchrone          ║
║ BOUTONS :      ❌ Plusieurs boutons morts (voir ci-dessous)        ║
║ FORMULAIRES :  ❌ « Envoyer » vide le brouillon, n'envoie rien     ║
║ FIREBASE :     ❌ Aucune connexion                                 ║
║ LIEN PUBLIC :  —                                                  ║
║ RESPONSIVE :   ⚠️ Hauteur fixe 640px, aside masqué < xl           ║
║ PERMISSIONS :  ❌ Pas de filtre participants                       ║
╚══════════════════════════════════════════════════════════════════╝
```

**Problèmes :**
- 🔴 **[BLOQUANT] L'envoi ne fait rien.** `onSubmit` appelle `e.preventDefault(); setDraft("")` — [Messages.tsx:116-119](src/pages/Messages.tsx#L116-L119). Le message disparaît, **rien n'est persisté**, alors que la page promet « toute confidentialité ».
- 🔴 **[BLOQUANT] Boutons d'action morts.** `IconBtn` (Appel, Vidéo, Infos, Pièce jointe, Emoji) sont des `<button type="button">` **sans `onClick`** — [Messages.tsx:88-90, 121-122, 181-191](src/pages/Messages.tsx#L181-L191).
- 🟡 **[FONCTIONNEL] Recherche conversation non câblée** : `<input>` sans `value/onChange` filtrant — [Messages.tsx:36-40](src/pages/Messages.tsx#L36-L40).
- 🟡 **[FONCTIONNEL] `conversations[0]` non gardé** : `useState(conversations[0].id)` plante si la liste est vide ([Messages.tsx:19](src/pages/Messages.tsx#L19)) ; `active = …find(...)!` non-null assertion dangereuse ([Messages.tsx:21](src/pages/Messages.tsx#L21)).
- 🟢 **[VISUEL] Responsive** : conteneur `h-[640px]` figé ; le volet détails (`aside`) n'apparaît qu'à partir de `xl` ([Messages.tsx:142](src/pages/Messages.tsx#L142)) — sur mobile le fil prend tout, acceptable mais à vérifier au pouce.

### 3.3 — Profil (dans Dashboard) — [ProfileSummaryCard.tsx](src/components/dashboard/ProfileSummaryCard.tsx)
- 🟡 **[FONCTIONNEL] Lecture seule.** Le profil s'affiche mais **aucune page d'édition** (nom, avatar, région, intérêts) n'existe — `users/{uid}` n'est jamais mis à jour après l'inscription. Avatar Storage non implémenté.

---

## 4. Inventaire des interactions mortes (périmètre dashboards & entrées)

| Élément | Emplacement | Problème | Sévérité |
|---------|-------------|----------|:--------:|
| Bouton « Envoyer » (messages) | [Messages.tsx:116](src/pages/Messages.tsx#L116) | Vide le champ, n'envoie pas | 🔴 |
| Appel / Vidéo / Infos / Pièce jointe / Emoji | [Messages.tsx:181](src/pages/Messages.tsx#L181) | `IconBtn` sans handler | 🔴 |
| Compteurs dashboard (8 / 2 / 3) | [Dashboard.tsx:48-50](src/pages/Dashboard.tsx#L48-L50) | Constantes en dur | 🔴 |
| « Recherches sauvegardées » | [Dashboard.tsx:31](src/pages/Dashboard.tsx#L31) | Constante, pas per-user | 🔴 |
| Déconnexion mobile | [AppHeader.tsx:131-151](src/components/layout/AppHeader.tsx#L131-L151) | **Absente** du drawer mobile (présente desktop [L71-80](src/components/layout/AppHeader.tsx#L71-L80)) | 🟡 |
| Recherche conversation | [Messages.tsx:36](src/pages/Messages.tsx#L36) | Input non contrôlé | 🟡 |
| « Mes pages » / « Créer une page » | Dashboard | N'existe pas | 🟡 |
| Édition de profil | — | N'existe pas | 🟡 |

---

## 5. Matrice de statut & scorecard

### Statut des surfaces dashboard existantes

| Page | Rôle | Rendu | Fetch | Boutons | Forms | Firebase | Public | Responsive | Perms | Statut |
|------|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| /dashboard | patient | ✅ | ❌ | ⚠️ | — | ❌ | ⚠️ | ✅ | ⚠️ | ❌ |
| /messages | patient | ✅ | ❌ | ❌ | ❌ | ❌ | — | ⚠️ | ❌ | ❌ |

### Scorecard par rôle (préparation production)

| Rôle | Dashboards prévus | Existants | Opérationnels | Score |
|------|:--:|:--:|:--:|:--:|
| patient_public | 2 (dashboard, messages) | 2 | 0 | **0 %** |
| Owner de page | 2 (création, gestion) | 0 | 0 | **0 %** |
| admin | 1 (back-office) | 0 | 0 | **0 %** |
| super_admin | 1 (gestion admins) | 0 | 0 | **0 %** |

> **Verdict** : aucun dashboard n'est aujourd'hui opérationnel au sens production. Les deux surfaces existantes sont des maquettes ; les trois espaces par rôle (page, admin, super-admin) restent à construire.

---

## 6. Backlog priorisé (alimente les phases d'implémentation)

### 🔴 Bloquants (à corriger en premier)
1. **Aligner types ⇄ règles** : `authorUid` (`CommunityPost`, `ForumThread`), `participants` (`Conversation`), nouveau type `Organization`. Sinon toute écriture échoue. → Phase 1
2. **Durcir les règles** : `super_admin`, anti-impersonation sur `create`, règles `organizations` (création `pending`, pas d'auto-validation). → Phase 1
3. **Messagerie réelle** : persistance `conversations/{id}/messages`, envoi fonctionnel, temps réel `onSnapshot` + cleanup. → Phase 3
4. **Dashboard réel** : remplacer compteurs/listes en dur par des lectures `users/{uid}/…` avec loading/empty/error. → Phase 2
5. **Cloisonnement** : chaque query filtrée par `uid`/`ownerUid` (règles + code). → transverse

### 🟡 Fonctionnels
6. Boutons morts de Messages (handler réel ou état désactivé « Bientôt disponible »). → Phase 3
7. Section « Mes pages » + flux « Créer une page ». → Phase 2/5
8. Page d'édition de profil (+ upload avatar Storage). → Phase 2
9. Déconnexion dans le drawer mobile. → Phase 6 (quick win, faisable immédiatement)
10. Recherche de conversation contrôlée. → Phase 3

### 🟢 Visuels / finitions
11. Empty states soignés (illustration + CTA) pour chaque liste dashboard. → Phase 2
12. Responsive Messages (hauteur fluide, vue mobile du volet détails). → Phase 6
13. Format des dates/nombres réels (une fois les data Firestore branchées). → Phase 2/3

---

## 7. Périmètre & limites
- Audit **statique** : pas d'exécution navigateur ni de test des règles déployées sur le projet `werguyaram`.
- Les dashboards `admin`/`super_admin`/`page` sont audités **en tant que cible** (ils n'existent pas) — leur « audit » est ici un cahier des charges.
- Ce document **ne remplace pas** les audits globaux ; il en extrait la vue dashboards et produit le backlog exécutable consommé par les Phases 1→6 du plan d'implémentation.
```

# AUDIT RÔLES & PERMISSIONS — Wergu Yaram

## 0. Rôles & statuts identifiés

**Rôles** (`src/types/domain.ts:3-8`, libellés `src/lib/constants.ts:58-64`) :
- `patient_public` — Patient
- `healthcare_facility` — Structure de santé
- `partner` — Partenaire
- `partner_donor` — Donateur
- `admin` — Administrateur

**Statuts** (`domain.ts:10`) : `pending` · `active` · `suspended`.
Attribution du statut à la création (`services/users.ts:7-9`) : patient → `active` ; tous les autres → `pending`.

> **Constat fondateur** : le code définit 5 rôles et 3 statuts, mais **l'application n'exploite quasiment pas cette granularité côté front**. Il n'existe **aucune UI conditionnée au rôle**, **aucun back-office admin**, et le statut `pending`/`suspended` **n'a aucun effet** sur ce que l'utilisateur peut faire ou voir.

---

## 1. Matrice rôles × routes

Légende : 🌐 public · 🔒 connecté requis · — = même accès pour tous.

| Route | Visiteur | Patient | Structure | Partenaire | Donateur | Admin | Contrôle réel |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `/` `/recherche` `/medicaments/*` `/pathologies/*` `/articles/*` `/etablissements/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🌐 aucun |
| `/communautes*` `/forum` `/besoins*` `/evenements/*` `/partenaires` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🌐 aucun |
| `/connexion` `/inscription` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🌐 |
| `/dashboard` | ❌→login | ✅ | ✅ | ✅ | ✅ | ✅ | 🔒 `ProtectedRoute` (auth seule) |
| `/messages` | ❌→login | ✅ | ✅ | ✅ | ✅ | ✅ | 🔒 `ProtectedRoute` (auth seule) |
| **(admin / modération)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **route inexistante** |

**Problèmes** :
- **Aucune route ne distingue les rôles.** `ProtectedRoute` (`src/components/layout/ProtectedRoute.tsx:18`) ne vérifie que `user` (connexion), jamais `role` ni `status`.
- **Aucune route d'administration** : impossible de valider un compte `pending`, modérer, ou éditer du contenu via l'UI, alors que `firestore.rules` prévoit explicitement des actions admin.
- Le **Dashboard est identique pour tous les rôles** (`Dashboard.tsx`) : contenu patient-centré (« Mes intérêts santé », « Médicaments enregistrés ») servi même à une structure, un partenaire ou un admin.

---

## 2. Matrice rôles × fonctionnalités

| Fonctionnalité | Patient | Structure | Partenaire | Donateur | Admin | État réel |
|----------------|:---:|:---:|:---:|:---:|:---:|---|
| Consulter le contenu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (mock) |
| Recherche | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (client) |
| S'inscrire / se connecter | ✅ | ✅ | ✅ | ✅ | n/a | ✅ |
| Tableau de bord | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ identique, données fictives |
| Poser une question (forum) | ➖ | ➖ | ➖ | ➖ | ➖ | ❌ bouton sans handler |
| Publier dans une communauté | ➖ | ➖ | ➖ | ➖ | ➖ | ❌ composer factice |
| Rejoindre une communauté | ➖ | ➖ | ➖ | ➖ | ➖ | ❌ bouton sans handler |
| Envoyer un message privé | ➖ | ➖ | ➖ | ➖ | ➖ | ❌ `onSubmit` vide le draft |
| Faire un don | n/a | n/a | n/a | ➖ | n/a | ❌ widget sans paiement |
| Soumettre un besoin d'équipement | ❌ | ➖ attendu | ❌ | ❌ | ✅ attendu | ❌ aucune UI |
| Valider un compte `pending` | ❌ | ❌ | ❌ | ❌ | ➖ attendu | ❌ aucune UI admin |
| Modérer / éditer le contenu | ❌ | ❌ | ❌ | ❌ | ➖ attendu | ❌ aucune UI admin |
| Suspendre un utilisateur | ❌ | ❌ | ❌ | ❌ | ➖ attendu | ❌ aucune UI admin |

➖ = censé être accessible mais **non fonctionnel** · n/a = hors périmètre du rôle.

---

## 3. Matrice rôles × permissions (front vs back)

| Permission | Contrôle FRONT | Contrôle BACK (Firestore) | Incohérence | Risque |
|------------|----------------|---------------------------|-------------|:---:|
| Lire son profil | implicite (`useAuth`) | ✅ `isOwner \|\| isAdmin` (`rules:23`) | — | Faible |
| Créer son profil avec rôle | `RoleSelector` limite à 4 rôles (pas admin) | ✅ rôle ∈ liste sans admin (`rules:24-26`) | — | Faible |
| Modifier rôle/statut | aucune UI | ✅ figés sauf admin (`rules:27-30`) | — | Faible |
| Publier post/thread | aucun (bouton mort) | ⚠️ `signed-in` sans `authorUid` (`rules:51,58`) | **front absent / back trop laxiste** | Haute (impersonation) |
| Accès `/dashboard` `/messages` | `ProtectedRoute` (auth) | n/a (mock) | **statut ignoré** | Moyenne |
| Actions admin | aucune UI | ✅ `isAdmin()` (`rules:16`) | **back prêt, front inexistant** | Moyenne |
| Messagerie | aucun (factice) | ✅ participants (`rules:64-72`) mais modèle sans `participants` | **modèle ↔ rules** | Moyenne |

---

## 4. Incohérences par rôle

### [RP-01] Le statut `pending` / `suspended` n'a aucun effet
- **Gravité** : Haute · **Priorité** : P1
- **Fichiers** : `services/users.ts:7-9` (statut posé), `components/layout/ProtectedRoute.tsx` (jamais lu), tout le front.
- **Description** : une structure/partenaire/donateur s'inscrit en `pending` (« nécessite validation »), mais obtient **immédiatement les mêmes accès** qu'un compte actif. Un compte `suspended` n'est **jamais bloqué**. Le workflow d'approbation est donc **purement décoratif**.
- **Impact** : promesse de modération non tenue ; comptes non vérifiés agissant comme vérifiés.
- **Recommandation** : appliquer le statut côté front (écrans « compte en attente de validation » / « suspendu ») **et** côté règles (ex. `status == 'active'` requis pour les écritures sensibles).

### [RP-02] Aucune interface d'administration
- **Gravité** : Haute · **Priorité** : P1
- **Description** : le rôle `admin` et les règles `isAdmin()` existent, mais **aucune page/route** ne permet de valider, modérer, éditer. Le back-office est inexistant.
- **Recommandation** : construire un module `/admin` (validation comptes, gestion contenu, modération) protégé par rôle.

### [RP-03] Dashboard mono-rôle
- **Gravité** : Moyenne · **Priorité** : P2
- **Fichier** : `src/pages/Dashboard.tsx`
- **Description** : tableau de bord patient-centré servi à tous les rôles, avec stats fictives identiques (`8` favoris, `2` communautés, `3` rappels — `:48-50`).
- **Recommandation** : dashboards différenciés par rôle (structure : ses besoins/établissement ; partenaire/donateur : ses contributions ; admin : back-office).

---

## 5. Escalade de privilèges

- **Auto-promotion admin** : **non possible** par les chemins applicatifs. `RoleSelector` n'offre pas `admin` ; `rules:24-26` interdit `admin` à la création ; `rules:27-29` fige `role`/`status` en update (sauf admin). ✅
- **Réserve** : l'absence de validation de forme (BE-02) permet d'injecter des champs arbitraires dans posts/threads, et l'absence de contrôle `authorUid` (SEC) permet l'**usurpation d'auteur** — ce n'est pas une escalade de rôle mais une escalade d'**identité de contenu**.

---

## 6. Corrections recommandées (priorisées)

1. **(P1)** Rendre le statut effectif (front : écrans pending/suspended ; back : `status=='active'` pour écrire).
2. **(P1)** Créer le back-office admin (validation, modération, contenu).
3. **(P1)** Étendre `ProtectedRoute` avec une variante `requireRole`/`requireStatus`.
4. **(P2)** Différencier le Dashboard par rôle.
5. **(P2)** Corriger les règles posts/threads (`authorUid == auth.uid`) — cf. SECURITY.

---

## 7. Matrice des parcours utilisateurs (synthèse)

| Rôle | Parcours type | Écrans | Frictions / bugs |
|------|---------------|--------|------------------|
| Visiteur | Découverte → recherche → détail → incitation à s'inscrire | Home, Search, détails | Boutons d'action morts s'il tente d'agir |
| Patient | Inscription → dashboard → forum/communauté → messages | Register, Dashboard, Forum, Community, Messages | Toutes les actions (poser, publier, envoyer) inopérantes |
| Structure | Inscription (`pending`) → … attente sans effet | Register, Dashboard | `pending` ignoré ; aucun espace structure ; soumission de besoin absente |
| Partenaire | Inscription (`pending`) → page partenaires | Register, Partners | « Proposer un partenariat » mort ; `pending` ignoré |
| Donateur | Inscription (`pending`) → besoin → don | Register, EquipmentDetail | Don sans paiement ; `pending` ignoré |
| Admin | (aucun parcours) | — | **Aucune UI** : ne peut rien administrer via l'app |

**Score (cohérence rôles/permissions) : 48/100.** Le socle de sécurité des rôles est correct (pas d'escalade, rôles figés), mais l'exploitation produit est très incomplète : statut sans effet, aucun back-office, dashboard mono-rôle, et permissions de contenu trop laxistes côté règles.

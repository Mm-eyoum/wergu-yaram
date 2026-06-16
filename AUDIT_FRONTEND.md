# AUDIT FRONT-END — Wergu Yaram

## 1. Pages analysées (18)

| Route | Page | Données | Connecté back ? |
|-------|------|---------|:---:|
| `/` | `Home.tsx` | mock | ❌ vitrine |
| `/recherche` | `SearchResults.tsx` | mock (index client) | ❌ |
| `/medicaments/:slug` | `MedicationDetail.tsx` | mock | ❌ |
| `/pathologies/:slug` | `PathologyDetail.tsx` | mock | ❌ |
| `/articles/:slug` | `ArticleDetail.tsx` | mock | ❌ |
| `/etablissements/:slug` | `FacilityDetail.tsx` | mock | ❌ |
| `/communautes` | `Communities.tsx` | mock | ❌ |
| `/communautes/:slug` | `CommunityDetail.tsx` | mock | ❌ |
| `/forum` | `Forum.tsx` | mock | ❌ (filtre client) |
| `/besoins` | `EquipmentList.tsx` | mock | ❌ (filtre client) |
| `/besoins/:id` | `EquipmentDetail.tsx` | mock | ❌ |
| `/evenements/:id` | `EventDetail.tsx` | mock | ❌ |
| `/partenaires` | `Partners.tsx` | mock | ❌ |
| `/connexion` | `Login.tsx` | Firebase Auth | ✅ |
| `/inscription` | `Register.tsx` | Firebase Auth + Firestore | ✅ |
| `/messages` 🔒 | `Messages.tsx` | mock | ❌ |
| `/dashboard` 🔒 | `Dashboard.tsx` | mock + user | ⚠️ partiel |
| `*` | `NotFound.tsx` | — | n/a |

🔒 = protégée par `ProtectedRoute`.

**Constat transverse** : seules **2 pages sur 18** déclenchent une vraie écriture/lecture back-end (Login, Register). Toutes les autres affichent du contenu fictif. Les détails (`:slug`/`:id`) gèrent correctement le cas « introuvable » via `EmptyState`.

---

## 2. Composants analysés (~44)

- **layout/** (5) : `AppShell`, `AppHeader`, `AppFooter`, `AuthLayout`, `ProtectedRoute`, `ScrollToTop`.
- **ui/** (~15) : `Button`+`ButtonLink`, `Badge`, `Avatar`, `Card`, `FormInput`, `Tabs`, `Breadcrumb`, `EmptyState`, `LoadingState`, `ProgressBar`, `SidebarPanel`, `CategoryPill`, `TrustStatsBar`, `Logo`.
- **cards/** (~11), **search/** (3), **auth/** (3 : `GoogleButton`, `RoleSelector`, `InterestSelector`), **community/** (2), **dashboard/** (2), **equipment/** (`DonationWidget`), **health/** (`MedicalDisclaimer`, `TrustBadge`).

**Qualité** : composition propre, primitives réutilisées, peu de duplication. `Button` (`src/components/ui/Button.tsx`) gère 5 variantes + 3 tailles + état `disabled` ; `ButtonLink` couvre les CTA de navigation. Bonne base.

**À refactorer** :
- `AppHeader.tsx` (~162 l.) : concentre nav desktop, menu utilisateur, drawer mobile → extraire `UserMenu` et `MobileDrawer`.
- `Register.tsx` (~237 l.) : stepper + 3 étapes dans un seul composant → extraire un composant par étape.

---

## 3. Boutons / actions cassés ou incomplets

Recherche heuristique (`<Button` sans `onClick`/`to`/`type`) + lecture manuelle. **7 boutons critiques sans aucun handler**, plus plusieurs formulaires « factices ».

---

### [FE-01] Boutons d'action principaux sans handler

- **Catégorie** : Front-end / logique métier
- **Gravité** : Haute · **Priorité** : P1
- **Zone** : Forum, Communauté, Médicament, Établissement, Événement, Partenaires
- **Rôle concerné** : tous (surtout connectés)
- **Fichiers** :
  - `src/pages/Forum.tsx:68` — « Poser une question »
  - `src/pages/CommunityDetail.tsx:82` — « Rejoindre »
  - `src/pages/MedicationDetail.tsx:142` — « Poser une question »
  - `src/pages/Partners.tsx:110` — « Proposer un partenariat »
  - `src/pages/FacilityDetail.tsx:71` & `:74` — CTA établissement
  - `src/pages/EventDetail.tsx:114` — « S'inscrire » (CTA pleine largeur)
- **Description** : ces `<Button>` n'ont ni `onClick`, ni `type="submit"`, ni navigation. Cliquer ne produit **rien** (le bouton primaire a juste un effet visuel `active:scale-[0.99]`).
- **Impact utilisateur** : sentiment de bug / d'abandon ; le cœur de l'engagement (poser une question, rejoindre, s'inscrire à un événement, donner) est inopérant.
- **Impact technique** : fonctionnalités déclarées mais non implémentées ; dette importante.
- **Risque business** : perte de confiance immédiate ; la promesse « communauté + entraide » n'est pas tenue.
- **Vérifier** : ouvrir chaque page, cliquer le bouton → aucune action réseau, aucun changement d'état.
- **Cause probable** : maquette livrée avant câblage back-end.
- **Recommandation** : court terme → désactiver + libellé « Bientôt disponible » ou toast informatif ; moyen terme → implémenter (création thread/post, adhésion communauté, inscription événement, modale don).
- **Effort** : Moyen (par action) · **Quick win** : partiel (le « disable + toast » est faible)

---

### [FE-02] Formulaires factices (UI sans persistance)

- **Gravité** : Haute · **Priorité** : P1 · **Catégorie** : Front-end / data flow
- **Fichiers** :
  - `src/pages/Messages.tsx:114-119` — `onSubmit` fait `e.preventDefault(); setDraft("")` → le message **n'est jamais envoyé**, juste effacé.
  - `src/components/community/CommunityComposer.tsx` — bouton « Publier » sans soumission.
  - `src/components/equipment/DonationWidget.tsx:85` — bouton « Soutenir » sans `onClick` (sélection de montant/méthode purement locale, aucun paiement).
- **Description** : ces formulaires donnent toutes les apparences du fonctionnel (validation, états `disabled`) mais **n'écrivent nulle part**.
- **Impact** : illusion de fonctionnement ; un utilisateur croit avoir envoyé un message / fait un don.
- **Risque business** : **majeur pour le don** (attente d'un paiement réel) — risque de réputation/confiance.
- **Recommandation** : implémenter l'envoi (messagerie Firestore), la publication (posts), et l'intégration paiement (cf. ROADMAP C5). En attendant : état explicite « non disponible ».
- **Effort** : Élevé · **Quick win** : Non

---

### [FE-03] Pas de déconnexion sur mobile

- **Gravité** : Moyenne · **Priorité** : P2 · **Catégorie** : Front-end / parcours
- **Fichier** : `src/components/layout/AppHeader.tsx:124-144` (drawer mobile)
- **Description** : le menu utilisateur desktop (`:72-81`) propose « Se déconnecter », mais le **drawer mobile ne l'expose pas** : il n'affiche que « Mon tableau de bord » et « Messages ». Un utilisateur connecté sur mobile **ne peut pas se déconnecter** depuis l'interface.
- **Impact** : sécurité/confidentialité sur appareil partagé ; frustration.
- **Recommandation** : ajouter un bouton « Se déconnecter » dans le bloc mobile connecté.
- **Effort** : Faible · **Quick win** : Oui

---

### [FE-04] Champ « Téléphone » mort à l'inscription

- **Gravité** : Faible · **Priorité** : P3 · **Catégorie** : Front-end / cohérence
- **Fichier** : `src/pages/Register.tsx:25` (state `phone`), `:144` (input)
- **Description** : le champ téléphone est saisi mais **jamais transmis** à `register()` (cf. `:62-69`) ni stocké dans le profil. Donnée perdue.
- **Recommandation** : soit le persister (ajouter `phone` au profil Firestore + type `AppUser`), soit le retirer.
- **Effort** : Faible · **Quick win** : Oui

---

## 4. Liens morts / suspects

| Lien | Fichier | Problème |
|------|---------|----------|
| « conditions d'utilisation » → `href="#"` | `src/pages/Register.tsx:209` | Lien mort : ne mène nulle part (et n'existe pas de page CGU). Problème **juridique** (consentement) + a11y. |
| Liens externes | — | Aucun `target="_blank"`/lien externe détecté → pas de risque `rel="noopener"` à ce stade. |

> Note : la navigation interne (React Router `Link`/`NavLink`/`ButtonLink`) est globalement saine ; les routes ciblées existent toutes dans `App.tsx`.

---

## 5. États UI (loading / empty / error / success)

| État | Présence | Détail |
|------|:---:|--------|
| **Loading (pages)** | ✅ | `Suspense` + `PageFallback`/`LoadingState` (`App.tsx:27`), `ProtectedRoute` (`:10-16`). |
| **Loading (actions)** | ⚠️ partiel | Login/Register gèrent `loading` sur le bouton. Les autres actions n'existent pas (donc pas d'état). |
| **Empty** | ✅ | `EmptyState` utilisé (Forum `:80`, détails introuvables, fichiers partagés `Messages:171`). |
| **Error** | ⚠️ | Auth : messages d'erreur affichés (`Login`, `Register`). Ailleurs : pas de chemin d'erreur car pas d'appels réseau. `catch` muets côté auth (`AuthContext:57`). |
| **Success** | ⚠️ | Login : redirection. Reset password : message info. Mais pas de feedback pour les actions factices. |
| **Disabled** | ✅ | Bien géré (`Button` `disabled:opacity-60`, boutons don/message désactivés si vide). |

---

## 6. Responsive (synthèse — détail dans rapport dédié si besoin)

- **Mobile-first** systématique (`sm:`/`md:`/`lg:`/`xl:`), drawer mobile (`AppHeader`), grilles adaptatives (`Dashboard`, `Messages` `:30`).
- **Points de vigilance** :
  - `Messages.tsx:30` : hauteur fixe `h-[640px]` — sur petit écran, peut être à l'étroit ; la 3ᵉ colonne (détails) est masquée `<xl` (OK).
  - Tableaux/listes longues : pas de virtualisation (acceptable vu le volume mock, à revoir avec vraies données).
- **Score responsive : 78/100.**

---

## 7. Accessibilité (synthèse — détail dans `AUDIT_ACCESSIBILITY.md`)

- ✅ Tous les `<img>` (14/14) ont un `alt`. Inputs avec `label`/`aria-label`. Boutons icônes avec `aria-label` (`Messages` `IconBtn`, header). `aria-expanded` sur le burger.
- ⚠️ Lien CGU `href="#"` ; pas de skip-link ; contrastes non vérifiés ; focus visible reposant sur le CSS de base.

---

## 8. Synthèse front-end

**Forces** : design system cohérent, code typé/propre, lazy-loading, états empty/loading présents, responsive soigné.

**Faiblesses majeures** : 7 boutons clés sans action (FE-01), formulaires factices dont le don (FE-02), déconnexion mobile absente (FE-03), lien CGU mort, champ mort. Le front « a l'air » fini mais l'interactivité métier est creuse.

**Score front-end : 62/100.** La qualité d'exécution UI est réelle, mais trop d'actions visibles sont non fonctionnelles pour parler d'un front-end « terminé ».

---

## 9. Matrice des boutons / actions critiques

| Écran | Bouton / action | Rôle | Handler front | Endpoint | Résultat attendu | Loading | Success | Error | Problème | Reco |
|-------|-----------------|------|---------------|----------|------------------|:---:|:---:|:---:|----------|------|
| Login | Se connecter | tous | `handleSubmit`→`login` | `firebase/auth` | redirection | ✅ | ✅ (nav) | ✅ | générique | messages fins |
| Login | Mot de passe oublié | tous | `handleReset`→`resetPassword` | `firebase/auth` | email envoyé | ❌ | ✅ (info) | ✅ | pas de loading | ajouter état |
| Login/Register | Google | tous | `handleGoogle`/inline | `firebase/auth` | connexion | ❌ | ✅ (nav) | ✅ | — | OK |
| Register | Continuer (étapes) | tous | `next` | — | étape suivante | n/a | n/a | ✅ inline | — | OK |
| Register | Créer mon compte | tous | `handleSubmit`→`register` | auth+`users/{uid}` | compte créé | ✅ | ✅ (nav) | ✅ | `phone` perdu | persister/retirer |
| Header (desktop) | Se déconnecter | connecté | `logout` | `firebase/auth` | déconnexion | ❌ | ✅ (nav) | ❌ | pas sur mobile | FE-03 |
| Forum | Poser une question | connecté | **aucun** | — | créer thread | ❌ | ❌ | ❌ | **mort** | implémenter |
| Communauté | Rejoindre | connecté | **aucun** | — | adhésion | ❌ | ❌ | ❌ | **mort** | implémenter |
| Communauté | Publier | connecté | factice | — | créer post | ❌ | ❌ | ❌ | **factice** | implémenter |
| Médicament | Poser une question | tous | **aucun** | — | — | ❌ | ❌ | ❌ | **mort** | câbler/neutraliser |
| Établissement | CTA (×2) | tous | **aucun** | — | — | ❌ | ❌ | ❌ | **mort** | câbler/neutraliser |
| Événement | S'inscrire | tous | **aucun** | — | inscription | ❌ | ❌ | ❌ | **mort** | implémenter |
| Partenaires | Proposer un partenariat | tous | **aucun** | — | contact | ❌ | ❌ | ❌ | **mort** | formulaire/mailto |
| EquipmentDetail | Soutenir (don) | donateur | **aucun** | — | paiement | ❌ | ❌ | ❌ | **mort + trompeur** | intégration paiement |
| Messages | Envoyer | connecté | `onSubmit` (vide draft) | — | message envoyé | ❌ | ❌ | ❌ | **non persisté** | messagerie Firestore |
| Messages | Appel/Vidéo/PJ/Emoji | connecté | **aucun** | — | — | n/a | n/a | n/a | **mort** | implémenter/retirer |

---

## 10. Matrice des formulaires

| Formulaire | Page | Champs | Validation front | Validation back | Endpoint | Gestion erreur | Gestion succès | A11y | Problèmes | Reco |
|------------|------|--------|------------------|-----------------|----------|----------------|----------------|------|-----------|------|
| Connexion | `Login.tsx` | email, mdp | requis, type email | Firebase | `signInWithEmailAndPassword` | ✅ message | ✅ redirection | label+aria, pas `aria-live` | erreurs génériques | A11Y-06 |
| Réinit. mdp | `Login.tsx` | email | requis | Firebase | `sendPasswordResetEmail` | ✅ | ✅ info | ⚠️ pas de loading | — | état loading |
| Inscription | `Register.tsx` | prénom, nom, email, tél, mdp, confirm, rôle, région, intérêts, CGU | requis, mdp≥6, confirmation, CGU cochée | Firestore rules (rôle∈liste) | auth+`users/{uid}` | ✅ message | ✅ redirection | `select` non lié, CGU `href=#` | `phone` perdu, CGU morte | FE-04, A11Y-01/05 |
| Composer communauté | `CommunityComposer.tsx` | contenu | trim | — | — | ❌ | ❌ | — | **factice** | implémenter |
| Message | `Messages.tsx` | texte | trim (disable) | — | — | ❌ | ❌ | aria-label | **non persisté** | implémenter |
| Don | `DonationWidget.tsx` | montant, méthode | min 500 (custom) | — | — | ❌ | ❌ | `fieldset/legend` ✅ | **pas de paiement**, min incohérent | C5, UI_UX |
| Recherche forum | `Forum.tsx` | requête, onglet | — | — | — (mock client) | n/a | ✅ filtre | leftIcon | client-only | recherche serveur |
| Filtres besoins | `EquipmentList.tsx` | région, urgence, catégorie | — | — | — (mock client) | n/a | ✅ filtre | pills | client-only | filtres serveur |

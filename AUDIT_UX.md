# Audit UX/UI — Wergu Yaram

**Auteur :** UX/UI Designer Senior (audit heuristique)
**Date :** juin 2026
**Périmètre :** UX/UI design pur — expérience, design system, hiérarchie visuelle, accessibilité,
parcours, heuristiques de Nielsen. Le volet technique (« tout est mock / boutons sans backend »)
est déjà couvert par `AUDIT_FRONTEND.md`, `AUDIT_DATA_FLOW.md` et `AUDIT_ROLES_PERMISSIONS.md` ;
il n'est repris ici que sous l'angle **friction utilisateur**.
**Méthode :** lecture du code et des tokens de design réels (les captures `screenshots/*.png` étant
vides au moment de l'audit). Les ratios de contraste sont **calculés** sur les couleurs hexadécimales
de production (`tailwind.config.ts`).

> **Note :** ce rapport documente l'état **avant** correctifs. Les correctifs marqués ✅ *Corrigé*
> ont été appliqués dans le même lot (voir section « Correctifs appliqués »).

---

## 1. Résumé exécutif

Wergu Yaram offre une **base UX de très bonne qualité** : direction artistique cohérente, design
system structuré (40+ composants, tokens propres), information architecture claire et vocabulaire
santé accessible. Le produit échoue cependant sur deux plans qui dégradent l'expérience réelle :
(1) une **couleur d'action sous le seuil de contraste WCAG** rendant CTA, liens et messages
partiellement illisibles ; (2) de nombreuses **fausses affordances** (boutons d'aspect cliquable
sans aucun retour), dont le plus grave est le bouton « Soutenir » d'un don — l'utilisateur croit
agir alors que rien ne se passe. À cela s'ajoutent des manques d'accessibilité (cibles tactiles,
skip-link, déconnexion mobile impossible) et l'absence de tout feedback système (pas de toast).

**Les 3 problèmes les plus critiques :**
1. 🔴 **Contraste de la couleur d'action** (`#00A878`) ≈ 2,97:1 → échec AA sur tous les CTA, liens et nav.
2. 🔴 **Fausses affordances** sur les actions clés (don, forum, communauté, inscription événement…).
3. 🔴 **Texte d'erreur** (`#FF6B6B`) ≈ 2,78:1 → les messages à lire en priorité sont les moins lisibles.

**Note globale UX : ≈ 5,9/10** — excellent design de surface, couche d'interaction et accessibilité à durcir.

---

## 2. Phase 1 — Compréhension produit

- **Objectif principal :** permettre à un citoyen sénégalais de **comprendre** sa santé, **s'orienter**
  vers une structure, **échanger** avec une communauté et **agir** (soutenir un besoin d'équipement).
  La **recherche universelle** est le cœur du parcours.
- **Persona principal :** patient / grand public — l'inscription crée un compte `patient_public`
  actif immédiatement. **Personas secondaires :** structure de santé, partenaire, donateur — qui ne
  sont plus des « rôles » à l'inscription mais des **pages Organisation** créées via
  `/dashboard/pages/new` ([CreatePage.tsx](src/pages/CreatePage.tsx)) et soumises à **validation**
  (« en attente de validation par un administrateur »). Les rôles élevés (`admin`/`super_admin`)
  ne sont accordés que par outillage de confiance.

  > *Mise à jour (post-audit) : ce modèle a remplacé l'ancien sélecteur à 4 rôles de l'inscription
  > pendant le cycle de correctifs. Le flux Organisation est réellement branché (Firestore) et adopte
  > le système de Toast introduit par cet audit — il n'entre donc pas dans les « fausses affordances ».*
- **Parcours critiques :** (a) Recherche → fiche (pathologie / médicament / établissement) ;
  (b) Découverte d'un besoin → don ; (c) Inscription / onboarding.
- **Modèle mental attendu :** « un annuaire santé local fiable et solidaire » (croisement Doctissimo
  + annuaire d'établissements + plateforme de dons).

**Ce qui fonctionne bien (brièvement) :** vocabulaire clair et localisé (FCFA, régions du Sénégal),
hiérarchie de pages logique, recherche fédérée avec raccourcis, badges de confiance, design aéré.

---

## 3. Phases 2→6 — Problèmes priorisés

### 🔴 Critiques

#### 🔴 [Critique] — Contraste insuffisant de la couleur d'action
- **📍 Localisation :** token `brand.green = #00A878` → tous les boutons primaires (`Button`),
  liens (`text-brand-green`), état actif de la nav, prix/montants, puces de don, bulles de message envoyé.
- **❌ Problème :** blanc sur `#00A878` ≈ **2,97:1** ; `#00A878` sur blanc/mint ≈ **2,97:1**.
- **🧠 Pourquoi :** WCAG AA exige **4,5:1** (texte normal) / 3:1 (grand texte). En dessous, le texte
  devient difficile à lire pour basse vision et **en plein soleil sur mobile** — contexte majoritaire
  de la cible. Viole l'heuristique 4 (standards) et l'accessibilité.
- **✅ Recommandation :** assombrir le vert d'action à `#007A5E` (≈ 5,3:1) et réserver le vert vif
  `#00A878` aux fonds **décoratifs** uniquement. *(Corrigé.)*
- **⚡ Quick win :** **Oui** (un seul token).

#### 🔴 [Critique] — Fausses affordances (CTA sans retour)
- **📍 Localisation :** `DonationWidget` « Soutenir » ([src/components/equipment/DonationWidget.tsx](src/components/equipment/DonationWidget.tsx)),
  Forum « Poser une question » ([src/pages/Forum.tsx](src/pages/Forum.tsx)), Communauté « Rejoindre »
  ([src/pages/CommunityDetail.tsx](src/pages/CommunityDetail.tsx)), Médicament « Poser une question »
  ([src/pages/MedicationDetail.tsx](src/pages/MedicationDetail.tsx)), Partenaires « Proposer un partenariat »
  ([src/pages/Partners.tsx](src/pages/Partners.tsx)), Événement « S'inscrire » ([src/pages/EventDetail.tsx](src/pages/EventDetail.tsx)),
  composer de communauté, envoi de message.
- **❌ Problème :** des boutons pleinement stylés comme actifs ne déclenchent **aucune action ni
  aucun retour**. Sur le don, l'utilisateur choisit un montant + un moyen de paiement et clique
  « Soutenir » → rien.
- **🧠 Pourquoi :** rupture de confiance majeure (heuristiques 1 « visibilité de l'état » et 9
  « récupération »). Sur un produit santé/solidaire, laisser croire à un don réalisé est un risque
  de réputation sérieux.
- **✅ Recommandation :** rendre l'affordance **honnête** — chaque action non encore branchée
  déclenche un feedback explicite « Bientôt disponible » (message dédié pour le don : *« aucun
  montant n'a été débité »*), via un système de toast accessible. *(Corrigé.)*
- **⚡ Quick win :** **Oui** (pattern unique réutilisé).

#### 🔴 [Critique] — Texte d'erreur sous le seuil de contraste
- **📍 Localisation :** `danger = #FF6B6B` → messages d'erreur de [Login.tsx](src/pages/Login.tsx),
  [Register.tsx](src/pages/Register.tsx), erreurs de `FormInput`.
- **❌ Problème :** `#FF6B6B` sur blanc ≈ **2,78:1** ; sur `bg-danger/10` encore moins.
- **🧠 Pourquoi :** ce sont précisément les messages qu'il faut pouvoir lire pour se corriger
  (heuristique 9). Échec AA.
- **✅ Recommandation :** assombrir `danger` à `#C81E1E` (≈ 5,7:1) — valable pour texte, bordure,
  fond `/10` et bouton danger. *(Corrigé.)*
- **⚡ Quick win :** **Oui.**

### 🟡 Majeurs

#### 🟡 [Majeur] — Déconnexion impossible sur mobile
- **📍 Localisation :** drawer mobile de [AppHeader.tsx](src/components/layout/AppHeader.tsx).
- **❌ Problème :** un utilisateur connecté ne voit que « Mon tableau de bord » et « Messages » ;
  aucun moyen de se déconnecter sous le breakpoint `xl`.
- **🧠 Pourquoi :** perte de contrôle (heuristique 3) et enjeu de confidentialité (appareil partagé).
- **✅ Recommandation :** ajouter « Se déconnecter » au drawer. *(Corrigé.)*
- **⚡ Quick win :** **Oui.**

#### 🟡 [Majeur] — Cibles tactiles < 44 px
- **📍 Localisation :** liens de nav (`py-2`, ~34 px), items du drawer (~40 px), puces montant/paiement
  du don (~40 px), bouton `sm` (h-9 = 36 px).
- **❌ Problème :** plusieurs cibles interactives sont sous le minimum tactile recommandé (44×44).
- **🧠 Pourquoi :** taux d'erreur de tap élevé sur mobile (loi de Fitts), pénalisant pour motricité
  réduite. Cible mobile-first.
- **✅ Recommandation :** `min-h-[44px]` sur les listes d'actions mobiles et les puces de don. *(Corrigé
  pour drawer + puces de don ; à étendre aux cartes denses.)*
- **⚡ Quick win :** **Oui** (partiel).

#### 🟡 [Majeur] — Champ « Téléphone » mort + lien CGU mort
- **📍 Localisation :** [Register.tsx](src/pages/Register.tsx) — champ téléphone collecté mais jamais
  transmis ; case obligatoire « J'accepte les conditions » pointant vers `href="#"`.
- **❌ Problème :** friction et collecte de PII inutile ; obligation d'accepter des CGU **introuvables**.
- **🧠 Pourquoi :** zone de doute juridique + perte de confiance ; viole l'heuristique 10 (documentation).
- **✅ Recommandation :** retirer le champ téléphone ; créer une page `/conditions` réelle et y pointer
  le lien. *(Corrigé.)*
- **⚡ Quick win :** **Oui.**

#### 🟡 [Majeur] — États vides sans porte de sortie
- **📍 Localisation :** [SearchResults.tsx](src/pages/SearchResults.tsx) (et `EmptyState` en général).
- **❌ Problème :** « Aucun résultat » n'offrait **aucune action** de récupération.
- **🧠 Pourquoi :** impasse cognitive ; l'utilisateur doit deviner quoi faire (heuristiques 3 et 9).
- **✅ Recommandation :** proposer « Réinitialiser les filtres » + « Explorer les pathologies ». *(Corrigé
  sur la recherche.)*
- **⚡ Quick win :** **Oui.**

#### 🟡 [Majeur] — Aucun système de feedback (toast/notification)
- **📍 Localisation :** global — seuls des encarts inline existaient (auth).
- **❌ Problème :** aucune réponse système transverse aux actions.
- **🧠 Pourquoi :** heuristique 1 (visibilité de l'état). Sans feedback, l'utilisateur ne sait jamais
  qu'« il s'est passé quelque chose ».
- **✅ Recommandation :** introduire un `ToastProvider` accessible (`aria-live`, auto-dismiss). *(Corrigé.)*
- **⚡ Quick win :** **Oui.**

### 🟢 Mineurs

#### 🟢 [Mineur] — Incohérences de design system
- **📍 Localisation :** `bg-slate-100` hors palette dans le stepper de [Register.tsx](src/pages/Register.tsx) ;
  ring de focus des `<select>`/inputs (`ring-brand-teal/30`) ≠ token global `:focus-visible`.
- **✅ Recommandation :** normaliser vers les tokens (`bg-border-soft`). *(Stepper corrigé.)* **⚡ Oui.**

#### 🟢 [Mineur] — Accessibilité fine
- **📍 Localisation :** pas de skip-link ; ring de focus en teal (≈ 2,6:1, < 3:1) ; pas de toggle
  afficher/masquer ni d'indicateur de robustesse du mot de passe.
- **✅ Recommandation :** skip-link « Aller au contenu », ring de focus en vert profond (≈ 5,3:1),
  toggle + jauge de robustesse à l'inscription. *(Corrigé.)* **⚡ Oui.**

---

## 4. Phase 7 — Scorecard Nielsen

| # | Heuristique | Score | Justification |
|---|-------------|:-----:|---------------|
| 1 | Visibilité de l'état du système | **5/10** | Loading des routes/auth OK, mais mutations sans aucun retour ; aucun toast (avant correctif). |
| 2 | Correspondance système / monde réel | **8/10** | Vocabulaire santé FR clair, FCFA, régions du Sénégal, métaphores justes. |
| 3 | Contrôle & liberté | **6/10** | Fil d'Ariane et retour du stepper présents, mais actions mortes « piègent » et pas de déconnexion mobile. |
| 4 | Cohérence & standards | **7/10** | Design system solide ; incohérences ponctuelles (`slate` hors palette, focus des champs). |
| 5 | Prévention des erreurs | **5/10** | Validation minimale ; pas de jauge de mot de passe ; don « accepté » puis inerte. |
| 6 | Reconnaissance plutôt que rappel | **7/10** | Raccourcis de recherche, onglets typés, badges de confiance. |
| 7 | Flexibilité & efficacité | **6/10** | Raccourcis utiles, mais pas de recherches récentes ni de filtres persistés. |
| 8 | Design esthétique & minimaliste | **8/10** | Visuel propre, aéré, hiérarchie claire. |
| 9 | Récupération des erreurs | **4/10** | Messages génériques, texte d'erreur peu lisible, états vides sans issue. |
| 10 | Aide & documentation | **3/10** | Aucune aide/FAQ ; lien CGU mort (avant correctif) ; pas de contact visible. |
| | **Moyenne** | **≈ 5,9/10** | Excellent design, couche d'interaction & a11y à durcir. |

---

## 5. Top 5 Quick Wins (fort impact, < 1 jour)

1. **Assombrir la couleur d'action** (`#00A878 → #007A5E`) → tous les CTA/liens/nav passent AA d'un coup.
2. **Rendre les CTA honnêtes** via un toast « Bientôt disponible » (message dédié pour le don).
3. **Assombrir le rouge d'erreur** (`#FF6B6B → #C81E1E`) → messages d'erreur lisibles.
4. **Ajouter la déconnexion** dans le drawer mobile.
5. **Page `/conditions` réelle** + retrait du champ téléphone mort à l'inscription.

> Les 5 ont été appliqués dans ce lot.

---

## 6. Recommandations stratégiques (3 chantiers à planifier)

1. **Boucler la couche d'interaction (du facade au fonctionnel).** Brancher réellement don/paiement,
   forum, messagerie, adhésion aux communautés. Tant que ce n'est pas fait, conserver le pattern
   « Bientôt disponible » pour ne jamais tromper l'utilisateur. *(Volet technique : voir `AUDIT_DATA_FLOW.md`.)*
2. **Compléter le design system manquant.** Modal/Dialog, Dropdown custom, Pagination, Toast (fait),
   composants de formulaire (Textarea, Radio/Checkbox group, Select stylé), et une doc type Storybook.
   Objectif : cohérence à l'échelle et états (vide/chargement/erreur) systématisés.
3. **Plan d'accessibilité WCAG AA de bout en bout.** Audit de contraste exhaustif (au-delà des tokens
   d'action), cibles tactiles ≥ 44 px généralisées, navigation clavier complète, `aria-*` sur les
   composants riches (onglets, menus, messagerie), et tests lecteur d'écran.

---

## 7. Correctifs appliqués dans ce lot

| Domaine | Correctif | Fichiers |
|---|---|---|
| Contraste action | `brand.green` → `#007A5E` + `brand.greenLight`/`greenDark` ; hover bouton primaire | [tailwind.config.ts](tailwind.config.ts), [Button.tsx](src/components/ui/Button.tsx) |
| Contraste erreur | `danger` → `#C81E1E` | [tailwind.config.ts](tailwind.config.ts) |
| Feedback système | `ToastProvider` accessible + hook `useToast` / `useComingSoon` | [src/context/ToastContext.tsx](src/context/ToastContext.tsx), [src/hooks/useToast.ts](src/hooks/useToast.ts), [main.tsx](src/main.tsx) |
| Affordances honnêtes | Tous les CTA morts → toast dédié | DonationWidget, Forum, CommunityDetail, MedicationDetail, Partners, EventDetail, CommunityComposer, Messages |
| Navigation | Déconnexion dans le drawer mobile | [AppHeader.tsx](src/components/layout/AppHeader.tsx) |
| États vides | Action de récupération sur la recherche | [SearchResults.tsx](src/pages/SearchResults.tsx) |
| Accessibilité | Skip-link, ring de focus vert (≥3:1), cibles ≥44 px (drawer + puces de don) | [AppShell.tsx](src/components/layout/AppShell.tsx), [index.css](src/index.css), [DonationWidget.tsx](src/components/equipment/DonationWidget.tsx) |
| Inscription | Retrait du champ téléphone, page `/conditions`, toggle + jauge de mot de passe, token stepper | [Register.tsx](src/pages/Register.tsx), [src/pages/Terms.tsx](src/pages/Terms.tsx), [App.tsx](src/App.tsx) |

**Validation :** `tsc --noEmit` ✅, `eslint .` ✅ (0 erreur), `npm run build` ✅.

### Hors périmètre (non traité ici)
Intégration paiement réelle, persistance Firestore des mutations, back-office admin, application des
statuts `pending`/`suspended` (cf. audits techniques existants) ; composants avancés (Modal, Dropdown,
Pagination, Storybook) ; audit de contraste exhaustif au-delà des tokens d'action.

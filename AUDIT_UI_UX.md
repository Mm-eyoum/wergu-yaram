# AUDIT UI / UX — Wergu Yaram

> Analyse d'expert UI/UX, écran par écran. Notes /10. La plateforme a un **fort capital visuel** (design system cohérent, palette santé verte, typographie Inter, espacements réguliers, arrondis et ombres maîtrisés). Le principal problème UX n'est **pas esthétique** : c'est l'écart entre une interface qui **paraît complète** et des actions qui **ne font rien** — ce qui érode la confiance, dimension critique pour une plateforme santé.

## Synthèse design system

- **Couleurs** : `brand.green #00A878`, `teal #00B894`, `navy #0B1F49`, `mint #EEFDF8`, `soft #F7FBFA` (`tailwind.config.ts`). Palette cohérente, identité santé claire.
- **Composants** : `Button` (5 variantes/3 tailles), `Badge`, `Card`, `FormInput`, `Tabs`, `EmptyState`, `LoadingState`, `Avatar`, `ProgressBar`, `Breadcrumb` — réutilisés partout. Cohérence forte.
- **Typo** : Inter 400-800, hiérarchie `text-2xl/3xl/extrabold` cohérente.
- **Feedback** : micro-interactions (`active:scale-[0.99]`, `animate-fade-in`), états `disabled` soignés.

---

## Analyse écran par écran

### `/` Home — UI 8 / UX 7
- **+** Hero de recherche clair, catégories santé, contenu mis en avant, `TrustStatsBar`.
- **−** Beaucoup de contenu fictif présenté comme réel ; CTA peuvent mener à des pages où les actions sont mortes.
- **Reco** : prioriser une proposition de valeur + 1 CTA principal ; bannière « bêta » tant que le contenu est mock.

### `/connexion` Login — UI 8 / UX 8
- **+** Layout splitté élégant (`AuthLayout`), bénéfices listés, états error/info, « mot de passe oublié » fonctionnel, Google, message si Firebase non configuré.
- **−** Erreurs génériques (« Email ou mot de passe incorrect »).
- **Reco** : conserver ; affiner les messages.

### `/inscription` Register — UI 8 / UX 6
- **+** Stepper 3 étapes clair, récapitulatif, validations (champs requis, mdp ≥ 6, confirmation), sélection rôle/région/intérêts.
- **−** Champ **téléphone** saisi mais perdu (`:144`) ; **lien CGU `href="#"`** mort (`:209`) alors qu'on demande de l'accepter (problème de consentement) ; le rôle « structure/partenaire/donateur » crée un compte `pending` **sans expliquer la suite** (« votre compte sera validé sous X »).
- **Reco** : retirer/persister téléphone, vraie page CGU, écran de confirmation expliquant le statut `pending`.

### `/dashboard` — UI 7 / UX 5
- **+** Mise en page riche, cartes thématiques, salutation personnalisée.
- **−** **Stats en dur** (`8` favoris, `2` communautés, `3` rappels — `:48-50`), notifications fictives (`:129-138`), identique pour tous les rôles. Donne une fausse impression de données personnelles.
- **Reco** : brancher de vraies données ; masquer les blocs vides ; différencier par rôle.

### `/recherche` SearchResults — UI 8 / UX 7
- **+** Recherche fédérée, onglets par type, `ResultCard` riche, filtres.
- **−** Recherche client-only (non scalable), pas de pagination.
- **Reco** : recherche serveur + pagination ; conserver l'UI.

### `/forum` Forum — UI 8 / UX 5
- **+** Tabs (Questions/Discussions/Conseils), recherche live, sidebar (thèmes, contributeurs, règles), badges « Résolu ».
- **−** **« Poser une question » sans handler** (`:68`) → cœur du forum inopérant. Threads non cliquables vers un détail (pas de page thread).
- **Reco** : implémenter la création + une page de détail de thread.

### `/communautes` & `/communautes/:slug` — UI 8 / UX 5
- **+** Grille de communautés, feed, règles, événements.
- **−** **« Rejoindre » mort** (`CommunityDetail:82`), composer factice. L'utilisateur ne peut ni adhérer ni publier.
- **Reco** : adhésion + publication réelles ; état « membre/non-membre ».

### `/besoins` & `/besoins/:id` EquipmentDetail — UI 8 / UX 5
- **+** `DonationWidget` très convaincant (montants, méthodes Wave/MoMo/carte, barre de progression, mention « paiement sécurisé »).
- **−** **Aucun paiement** : le bouton « Soutenir » n'a pas de handler (`DonationWidget:85`). Incohérence montant : presets ≥ 5 000 FCFA mais custom `min=500` (`:57`). La mention « Paiement sécurisé · 100 % reversé » est **trompeuse** sans transaction réelle.
- **Reco** : intégration paiement + reçu ; aligner les montants min ; ne pas afficher de garantie de paiement tant qu'il n'existe pas.

### `/messages` Messages — UI 8 / UX 4
- **+** Interface de chat 3 colonnes soignée, fichiers partagés, badges vérifié.
- **−** **Envoi factice** (`:114-119`), boutons appel/vidéo/pièce-jointe/emoji sans action (`IconBtn`), hauteur fixe `h-[640px]`. « Échangez en toute confidentialité » alors que rien n'est transmis.
- **Reco** : messagerie Firestore temps réel ; retirer/activer les icônes ; hauteur fluide.

### `/partenaires` Partners — UI 8 / UX 6
- **−** **« Proposer un partenariat » mort** (`:110`).
- **Reco** : formulaire de contact partenaire (même un `mailto:`/formulaire simple en quick win).

### Détails contenu (`/medicaments`, `/pathologies`, `/articles`, `/etablissements`, `/evenements`) — UI 8 / UX 7
- **+** Pages riches, `MedicalDisclaimer`, `TrustBadge`, TOC, contenus liés, `EmptyState` si introuvable.
- **−** Boutons secondaires morts (`MedicationDetail:142`, `FacilityDetail:71/74`, `EventDetail:114` « S'inscrire »).
- **Reco** : câbler ou neutraliser ces CTA.

### `*` NotFound — UI 8 / UX 8
- **+** 404 propre avec retour à la recherche. ✅

---

## Quick wins UX

1. Neutraliser tous les boutons morts (disable + « Bientôt disponible »/toast) — supprime l'effet « cassé ». (Forum, Communauté, Partenaires, Don, Messages, détails)
2. Ajouter la **déconnexion mobile** (`AppHeader`).
3. Vraie page **CGU** (ou route dédiée) au lieu de `href="#"`.
4. Aligner le **montant min de don** (custom vs presets).
5. Écran de confirmation post-inscription pour les rôles `pending` (« compte en cours de validation »).
6. Bannière « version bêta / données de démonstration » tant que le contenu est mock — honnêteté = confiance.

## Refontes nécessaires (moyen terme)

1. **Dashboard différencié par rôle** avec vraies données.
2. **Messagerie réelle** (temps réel) ou retrait temporaire de la fonctionnalité.
3. **Parcours de don** complet (paiement + reçu + mise à jour de la collecte).
4. **Parcours communauté/forum** complet (adhésion, publication, détail thread, modération).

## Composants UI à standardiser

- Un composant **`Toast`/notification** (absent) pour le feedback des actions.
- Un composant **`Modal`/Dialog** accessible (absent) pour don, composer, confirmation.
- Un état **« non disponible »** réutilisable pour les fonctionnalités en attente.

**Score UI : 80/100 · Score UX : 56/100 → UI/UX global : 68/100.** L'exécution visuelle est de niveau professionnel et homogène. L'UX est pénalisée par l'écart entre apparence et réalité : trop d'actions visibles sont inertes, et certaines formulations (paiement sécurisé, confidentialité, données personnelles) promettent ce que le produit ne tient pas encore.

# AUDIT ACCESSIBILITÉ — Wergu Yaram

> Évaluation selon les principes WCAG 2.1 (Perceptible, Utilisable, Compréhensible, Robuste). Analyse **statique du code** — non testée avec un lecteur d'écran réel ni un outil de contraste automatisé.

## Synthèse

Le projet montre une **conscience a11y au-dessus de la moyenne** : labels de formulaire, `aria-label` sur les boutons-icônes, `alt` sur 100 % des images, `aria-expanded` sur le menu mobile, focus visible géré dans le CSS de base. Les lacunes sont **ciblées** : lien mort `href="#"`, absence de skip-link, contrastes non vérifiés (notamment texte secondaire et blanc sur vert), gestion du focus dans les menus déroulants, et hiérarchie de titres à confirmer page par page.

---

## Constats positifs

| Critère | Preuve |
|---------|--------|
| Labels de formulaire | `FormInput` (label + `id`), `aria-label` sur inputs sans label visible (`Messages:39,128`) |
| Boutons-icônes nommés | `IconBtn` `aria-label` (`Messages:185`), burger `aria-label="Ouvrir le menu"` (`AppHeader:99`) |
| États ARIA | `aria-expanded={mobileOpen}` (`AppHeader:100`) |
| Images | **14/14 `<img>` ont un `alt`** (vérifié) |
| Focus visible | Anneau de focus défini dans `index.css` (focus-visible) |
| HTML sémantique | `header`, `nav`, `main`, `aside`, `section`, `article`, `ol/ul/dl`, hiérarchie `h1`→`h4` |
| Navigation clavier de base | Éléments natifs `<button>`/`<a>`/`<input>` (focusables par défaut) |

---

## Problèmes

### [A11Y-01] Lien « conditions d'utilisation » non fonctionnel
- **Critère** : WCAG 2.4.4 (Fonction du lien) · **Niveau** : Majeur · **Priorité** : P2
- **Fichier** : `src/pages/Register.tsx:209` (`href="#"`)
- **Impact** : lien annoncé par le lecteur d'écran mais sans destination ; de plus on demande d'accepter des CGU inaccessibles (problème a11y **et** juridique).
- **Correction** : vraie route `/conditions` (ou modale accessible).

### [A11Y-02] Absence de lien d'évitement (skip-link)
- **Critère** : WCAG 2.4.1 (Contourner des blocs) · **Niveau** : Majeur · **Priorité** : P2
- **Fichier** : `src/components/layout/AppShell.tsx` / `AppHeader.tsx`
- **Impact** : un utilisateur clavier/lecteur d'écran doit traverser tout le header (logo, recherche, nav, menu) à chaque page.
- **Correction** : ajouter un « Aller au contenu » (`<a href="#main">`) en tête + `id="main"` sur le `<main>`.

### [A11Y-03] Contrastes non vérifiés (texte secondaire / blanc sur vert)
- **Critère** : WCAG 1.4.3 (Contraste minimum) · **Niveau** : À confirmer / potentiellement Majeur · **Priorité** : P2
- **Zones** : `text-text-secondary` (gris), textes blancs sur `brand-green #00A878` (boutons, badges), `text-[11px]`/`text-[10px]` (méta, horodatages messages).
- **Impact** : risque de ratio < 4,5:1 pour les petits textes gris et blanc/vert ; les très petites tailles aggravent.
- **Correction** : mesurer les paires de couleurs ; assombrir le vert pour le texte blanc si < 4,5:1 ; éviter le texte < 12 px porteur d'information.
- **Note** : à valider avec un outil (axe, Lighthouse, contrast checker).

### [A11Y-04] Gestion du focus dans le menu utilisateur (dropdown)
- **Critère** : WCAG 2.1.1 / 2.4.3 (Clavier / Ordre du focus) · **Niveau** : Moyen · **Priorité** : P2
- **Fichier** : `src/components/layout/AppHeader.tsx:65-83`
- **Description** : le dropdown se ferme sur `onMouseLeave` (souris uniquement) ; pas de fermeture sur `Échap`, pas de piégeage/retour de focus, pas de `role="menu"`/`aria-haspopup`/`aria-expanded` sur le bouton déclencheur.
- **Correction** : gérer `Escape`, le focus au clavier, et les attributs ARIA du pattern menu.

### [A11Y-05] Champs `<select>` / cases à cocher — libellés programmatiques
- **Critère** : WCAG 1.3.1 / 4.1.2 · **Niveau** : Moyen · **Priorité** : P2
- **Fichier** : `Register.tsx:167` (`<select>` région avec `<label>` non lié par `htmlFor`/`id`), `:206` (checkbox CGU dans un `<label>` englobant — OK).
- **Correction** : lier explicitement `label`↔`select` via `htmlFor`/`id`.

### [A11Y-06] Boutons d'action sans retour accessible
- **Critère** : WCAG 4.1.3 (Messages d'état) · **Niveau** : Moyen · **Priorité** : P2
- **Description** : quand des actions fonctionneront (envoi, don), prévoir `aria-live` pour annoncer succès/erreur. Aujourd'hui les erreurs auth sont affichées visuellement mais sans `role="alert"`/`aria-live` (`Login.tsx:102`, `Register.tsx:128`).
- **Correction** : ajouter `role="alert"`/`aria-live="polite"` aux zones de message.

### [A11Y-07] Hiérarchie des titres à auditer page par page
- **Critère** : WCAG 1.3.1 / 2.4.6 · **Niveau** : Mineur · **Priorité** : P3
- **Description** : globalement un `h1` par page, mais vérifier qu'aucun saut de niveau (h1→h3) n'existe dans les pages riches (détails, dashboard).

### [A11Y-08] Cibles tactiles
- **Critère** : WCAG 2.5.5 (Taille des cibles) · **Niveau** : Mineur · **Priorité** : P3
- **Constat** : la plupart des boutons font `h-9`–`h-12` (≥ 36–48 px) ✅. Vérifier les petits boutons texte (« Mot de passe oublié ? » `Login:127`, badges cliquables) et `IconBtn` `h-9 w-9` (36 px, limite basse vs 44 px recommandé).

---

## Tableau récapitulatif

| ID | Problème | Niveau | Priorité | Fichier |
|----|----------|--------|:---:|---------|
| A11Y-01 | Lien CGU `href="#"` | Majeur | P2 | `Register.tsx:209` |
| A11Y-02 | Pas de skip-link | Majeur | P2 | `AppShell`/`AppHeader` |
| A11Y-03 | Contrastes à vérifier | Majeur (à confirmer) | P2 | global / `tailwind.config.ts` |
| A11Y-04 | Focus dropdown menu | Moyen | P2 | `AppHeader.tsx:65` |
| A11Y-05 | `select` non lié au label | Moyen | P2 | `Register.tsx:167` |
| A11Y-06 | Messages sans `aria-live` | Moyen | P2 | `Login.tsx:102`, `Register.tsx:128` |
| A11Y-07 | Hiérarchie titres | Mineur | P3 | pages riches |
| A11Y-08 | Cibles tactiles limites | Mineur | P3 | `IconBtn`, boutons texte |

---

## Recommandations prioritaires

1. **(P2)** Skip-link + `id="main"` (rapide, fort impact clavier).
2. **(P2)** Auditer/corriger les contrastes (outil automatisé) — critique en santé (lisibilité).
3. **(P2)** Vraie page CGU (A11Y-01).
4. **(P2)** Pattern menu accessible (Escape + focus + ARIA).
5. **(P2)** `aria-live` sur les messages d'état.
6. **(P3)** Vérifier hiérarchie de titres et tailles de cibles.

**Score accessibilité : 64/100.** Socle correct et au-dessus de la moyenne (labels, alt, aria-label, focus visible, sémantique), mais des lacunes structurelles (skip-link, contrastes non validés, focus des menus, lien mort) empêchent une conformité WCAG AA. Aucun de ces points n'est bloquant techniquement ; tous sont corrigeables à effort faible/moyen.

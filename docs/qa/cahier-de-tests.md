# Cahier de tests QA — Wergu Yaram

> Plateforme santé / communautaire (Sénégal, FR). React 18 + Vite + Firebase (Auth, Firestore, Storage) + Cloud Functions.
> Document destiné à un **testeur sans connaissance technique** : chaque test est reproductible pas-à-pas, avec un résultat attendu précis.
>
> **Légende sévérité** : 🔴 Critique (bloque l'argent, les données ou le parcours principal) · 🟡 Majeur (dégrade l'expérience) · 🟢 Mineur (cosmétique / confort).
> **Légende status** : ⬜ À tester · ✅ OK · ❌ KO · ⏭️ Non applicable.
>
> _Version 1.0 — base de code : branche `audit-360-remediation`._

---

## Sommaire

1. [Carte fonctionnelle](#1-carte-fonctionnelle)
2. [Cahier de tests par module](#2-cahier-de-tests-par-module)
   - [M1 — Navigation & Architecture](#m1--navigation--architecture)
   - [M2 — Authentification & Compte](#m2--authentification--compte)
   - [M3 — Formulaires & Saisie de données](#m3--formulaires--saisie-de-données)
   - [M4 — Parcours critiques (Core Flows)](#m4--parcours-critiques-core-flows)
   - [M5 — Affichage & Rendu visuel](#m5--affichage--rendu-visuel)
   - [M6 — Responsive & Cross-browser](#m6--responsive--cross-browser)
   - [M7 — Performance & Chargement](#m7--performance--chargement)
   - [M8 — Sécurité (tests fonctionnels)](#m8--sécurité-tests-fonctionnels)
   - [M9 — Emails & Notifications](#m9--emails--notifications)
   - [M10 — Accessibilité](#m10--accessibilité)
   - [M11 — SEO & Métadonnées](#m11--seo--métadonnées)
3. [Tests de régression prioritaires](#3-tests-de-régression-prioritaires)
4. [Matrice de couverture](#4-matrice-de-couverture)
5. [Smoke test (pré-prod)](#5-smoke-test-pré-prod)
6. [Zones d'ombre à clarifier](#6-zones-dombre-à-clarifier)

---

## 1. Carte fonctionnelle

### Objectif de la plateforme
Portail santé pour le Sénégal regroupant : **information santé curée** (médicaments, pathologies, articles/vidéos, établissements), **annuaire géolocalisé** d'établissements (carte OSM + import Google Places, pages réclamables), **communautés & forum**, **pages organisations** type FB/LinkedIn (structures de santé, partenaires, donateurs), et **campagnes de dons d'équipement** (paiement Bictorys : Wave / Orange Money / MTN / carte).

### Rôles utilisateurs
| Rôle | Rang | Capacités clés |
|---|---|---|
| `patient_public` | 0 | Compte de base : créer/gérer des pages, poster en forum/communauté, favoris, messages, demander un claim, donner. |
| `editor` | 1 | + Accès admin contenu : créer/éditer/publier les 8 types de contenu, médiathèque. |
| `admin` | 2 | + Modération des pages, claims, gestion utilisateurs, menus, paramètres. |
| `super_admin` | 3 | + Attribution des rôles. Compte de référence : `max.eyoum@eyone.net`. |

Garde-fous : `ProtectedRoute` (auth + rôle min.) et `RequirePermission` (permission fine) côté UI ; **la sécurité réelle est dans `firestore.rules`**.

### Routes
**Publiques :** `/` · `/recherche` · `/carte` · `/medicaments/:slug` · `/pathologies/:slug` · `/articles/:slug` · `/etablissements/:slug` · `/structures/:id` · `/communautes` · `/communautes/:slug` · `/forum` · `/besoins` · `/besoins/:id` · `/evenements/:id` · `/partenaires` · `/connexion` · `/inscription` · `/conditions` · `*` (404).

**Authentifiées (`patient_public`+) :** `/messages` · `/dashboard` · `/dashboard/profile` · `/dashboard/pages/new` · `/dashboard/pages/:id`.

**Admin (`editor`+, sous `/admin`) :** `/admin` (index) · `/admin/content` · `/admin/content/:type[/new | /:id/edit]` · `/admin/media` · `/admin/moderation` · `/admin/directory` · `/admin/users` · `/admin/menus` · `/admin/settings` · `/admin/comments` · `/admin/audit-log`. _(Toute URL `/admin/*` inconnue redirige vers `/admin`.)_

### Parcours critiques
1. **Don** (argent) : `/besoins/:id` → widget → `createBictorysCharge` → checkout Bictorys → webhook → MAJ `raisedAmount`/`donorsCount`.
2. **Onboarding & page** : inscription → profil → création page organisation → modération admin → publication.
3. **Découverte** : recherche fédérée (Typesense, fallback mock) → page de détail.
4. **Annuaire** : import Google Places (admin) → claim utilisateur → approbation admin.
5. **Messagerie** : conversation entre utilisateurs.

### Intégrations externes
Bictorys (dons, Cloud Function + webhook HMAC, rate-limit 20/h) · Google Places (import annuaire) · OSM Photon + Nominatim (géocodage) · Typesense (recherche) · Chatwoot (support) · Firebase Auth (emails reset/vérif).

### Inventaire des formulaires
Inscription (3 étapes) · Connexion (+ Google + reset) · Édition profil (+ avatar ≤ 5 Mo) · Création/gestion page · Message · Nouveau thread forum · Post communauté · Demande de claim · Import annuaire · Upload média (≤ 25 Mo) · Éditeur de contenu (8 types) · Widget de don · Paramètres site · Config menus.

**Bornes de saisie serveur (`src/lib/validation.ts`, miroir de `firestore.rules`) :** displayName ≤ 120 · organizationName 2–150 · postContent 1–5000 · threadTitle 1–200 · threadExcerpt 1–5000 · claimJustification 1–2000 · messageText 1–5000.

---

## 2. Cahier de tests par module

### M1 — Navigation & Architecture

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-001 | Liens de navigation principale | 1. Ouvrir `/` → 2. Cliquer successivement chaque item de `PRIMARY_NAV` (Carte, Communautés, Forum, Équipements, Partenaires…) | Chaque clic mène à la page correspondante, sans 404 ni page blanche | 🔴 | ⬜ |
| T-002 | Logo → accueil | 1. Aller sur `/forum` → 2. Cliquer le logo dans l'en-tête | Redirection vers `/` | 🟡 | ⬜ |
| T-003 | Méga-menu « Explorer » | 1. Sur desktop, cliquer « Explorer » → 2. Cliquer « Médicaments » | Le menu s'ouvre puis mène à `/recherche?type=medicament` avec le filtre déjà appliqué | 🟡 | ⬜ |
| T-004 | Lien « Voir tout le portail » | 1. Ouvrir « Explorer » → 2. Cliquer le lien de pied de menu | Redirection vers `/recherche` (tous types) | 🟢 | ⬜ |
| T-005 | Menu mobile : ouverture/fermeture | 1. Réduire à < 1280px → 2. Ouvrir le hamburger → 3. Le fermer (croix + clic extérieur) | Le tiroir s'ouvre, se ferme par les deux moyens, sans bloquer le scroll de la page | 🟡 | ⬜ |
| T-006 | Menu mobile : tous les liens | 1. Ouvrir le tiroir mobile → 2. Cliquer chaque lien (y compris accordéon Explorer) | Chaque lien navigue correctement et ferme le tiroir | 🟡 | ⬜ |
| T-007 | Liens du footer | 1. Aller en bas de page → 2. Cliquer « Conditions d'utilisation » et chaque lien des groupes dynamiques | « Conditions » mène à `/conditions` ; les liens dynamiques (config `useSiteConfig`) pointent vers une destination valide | 🟡 | ⬜ |
| T-008 | Liens réseaux sociaux | 1. Footer → 2. Cliquer chaque icône sociale renseignée | Ouverture du bon profil dans un nouvel onglet (`target=_blank`, `rel=noopener`) ; icône absente si l'URL n'est pas configurée | 🟢 | ⬜ |
| T-009 | Page 404 | 1. Saisir une URL inexistante (`/xyz123`) | Page « Page introuvable / 404 » avec barre de recherche et bouton « Retour à l'accueil » | 🔴 | ⬜ |
| T-010 | 404 : retour utile | 1. Sur la 404 → 2. Cliquer « Retour à l'accueil » | Redirection vers `/` ; la recherche depuis la 404 fonctionne aussi | 🟡 | ⬜ |
| T-011 | Aucun lien cassé | 1. Parcourir systématiquement chaque page → 2. Survoler/cliquer tous les liens | Aucun lien ne renvoie 404/erreur ; aucun `href="#"` mort | 🟡 | ⬜ |
| T-012 | Navigation clavier (Tab) | 1. Depuis `/`, naviguer uniquement au clavier (Tab/Shift+Tab) | L'ordre de focus suit l'ordre visuel logique ; aucun piège de focus ; le menu mobile est atteignable | 🟡 | ⬜ |
| T-013 | Scroll-to-top au changement de page | 1. Scroller en bas d'une liste → 2. Cliquer un lien vers une autre page | La nouvelle page s'affiche en haut (composant `ScrollToTop`) | 🟢 | ⬜ |

### M2 — Authentification & Compte

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-020 | Inscription valide (3 étapes) | 1. `/inscription` → 2. Étape 1 : prénom/nom/email/mdp valides → 3. Étape 2 : région + intérêts → 4. Étape 3 : cocher CGU → Valider | Compte Firebase créé + profil Firestore `users/{uid}` (`role=patient_public`, `status=active`) ; redirection vers une page connectée | 🔴 | ⬜ |
| T-021 | Email déjà existant | 1. S'inscrire avec un email déjà utilisé | Message d'erreur clair (« email déjà utilisé »), pas de compte dupliqué | 🔴 | ⬜ |
| T-022 | Mot de passe trop faible | 1. Étape 1 → saisir un mdp < 8 caractères | Rejet + jauge de force (faible/moyen/bon/fort) + indication des critères | 🟡 | ⬜ |
| T-023 | Mot de passe ≠ confirmation | 1. Étape 1 → mdp et confirmation différents | Erreur sur le champ confirmation, soumission bloquée | 🟡 | ⬜ |
| T-024 | Champs vides | 1. Étape 1 → laisser un champ requis vide → Suivant | Validation client : message sur le bon champ, on ne passe pas à l'étape suivante | 🟡 | ⬜ |
| T-025 | CGU non cochées | 1. Atteindre l'étape 3 sans cocher les CGU → Valider | Soumission bloquée + message demandant l'acceptation | 🟡 | ⬜ |
| T-026 | Connexion valide | 1. `/connexion` → 2. Identifiants corrects → Valider | Connexion réussie + redirection (vers `from` si présent, sinon `/dashboard`) | 🔴 | ⬜ |
| T-027 | Identifiants invalides | 1. `/connexion` → 2. Mauvais mdp | Message d'erreur **générique** (ne révèle pas si l'email existe) | 🔴 | ⬜ |
| T-028 | Google OAuth | 1. `/connexion` → 2. « Continuer avec Google » → choisir un compte | Popup Google, connexion réussie ; au 1er login un profil par défaut est créé | 🟡 | ⬜ |
| T-029 | Mot de passe oublié | 1. `/connexion` → « Mot de passe oublié ? » → saisir l'email → Envoyer | Confirmation d'envoi ; email de réinitialisation Firebase reçu | 🔴 | ⬜ |
| T-030 | Lien de reset fonctionnel | 1. Ouvrir l'email reçu → 2. Cliquer le lien → 3. Saisir un nouveau mdp | Le nouveau mot de passe est accepté et permet de se reconnecter | 🔴 | ⬜ |
| T-031 | Lien de reset expiré | 1. Utiliser un lien de reset périmé/déjà utilisé | Message clair (lien invalide/expiré) + possibilité de redemander | 🟡 | ⬜ |
| T-032 | Déconnexion | 1. Connecté → menu utilisateur → « Se déconnecter » | Session détruite, retour à une page publique, session Chatwoot réinitialisée | 🟡 | ⬜ |
| T-033 | Route protégée sans session | 1. Déconnecté → ouvrir `/dashboard` directement | Redirection vers `/connexion` (avec mémorisation de `from`) | 🔴 | ⬜ |
| T-034 | Retour post-login | 1. Déconnecté → ouvrir `/messages` → être redirigé vers login → se connecter | Après connexion, redirection automatique vers `/messages` | 🟡 | ⬜ |
| T-035 | Session expirée | 1. Connecté → invalider/expirer la session → 2. Effectuer une action authentifiée | Comportement gracieux (re-demande de connexion), **pas d'erreur 500** ni écran blanc | 🟡 | ⬜ |
| T-036 | Édition de profil | 1. `/dashboard/profile` → 2. Modifier nom/région/intérêts → Enregistrer | Sauvegarde Firestore + MAJ du profil Firebase Auth ; valeurs persistées au rechargement | 🟡 | ⬜ |
| T-037 | Accès admin selon rôle | 1. Connecté en `patient_public` → ouvrir `/admin` | Accès refusé / « Accès réservé » et redirection ; le lien Administration n'apparaît pas dans le menu | 🔴 | ⬜ |

### M3 — Formulaires & Saisie de données

> S'applique à **chaque** formulaire de l'inventaire. Les bornes serveur sont dans `TEXT_LIMITS`.

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-050 | Soumission complète valide (par formulaire) | 1. Remplir chaque formulaire avec des données valides → Soumettre | Succès + feedback de confirmation ; donnée persistée | 🔴 | ⬜ |
| T-051 | Champ requis vide | 1. Laisser un champ obligatoire vide → Soumettre | Erreur affichée **à côté du champ** concerné (pas seulement en haut) | 🟡 | ⬜ |
| T-052 | Messages compréhensibles | 1. Provoquer chaque erreur de validation | Messages en français clair, sans jargon technique ni « permission-denied » brut | 🟡 | ⬜ |
| T-053 | Cohérence validation client/serveur | 1. Saisir un texte > borne max (ex. message > 5000 car.) | Rejet côté client avec la même limite que `firestore.rules` (`isText`) | 🟡 | ⬜ |
| T-054 | Format email | 1. Champ email → saisir `abc@`, `abc.com` | Rejeté avec message de format | 🟡 | ⬜ |
| T-055 | Injection XSS | 1. Dans un champ texte (nom page, post, message), saisir `<script>alert('x')</script>` → Soumettre | Aucune exécution de script ; le contenu est échappé/affiché en texte brut | 🔴 | ⬜ |
| T-056 | Injection type requête | 1. Saisir des charges type SQL/NoSQL (`' OR 1=1`, `{$gt:""}`) | Aucun effet ; traité comme texte littéral | 🔴 | ⬜ |
| T-057 | Champ numérique (don) | 1. Widget de don → « Autre montant » → saisir des lettres | Lettres refusées ou ignorées ; seuls les nombres acceptés | 🟡 | ⬜ |
| T-058 | Borne montant min/max | 1. Don custom → saisir 100 (sous min) puis 9 999 999 (au-dessus) | Montants hors plage rejetés (plage serveur appliquée par la Cloud Function) | 🔴 | ⬜ |
| T-059 | Upload avatar — type | 1. `/dashboard/profile` → uploader un `.pdf` comme avatar | Rejet : seuls les `image/*` acceptés, message clair | 🟡 | ⬜ |
| T-060 | Upload avatar — taille | 1. Uploader une image > 5 Mo | Rejet avec la limite indiquée (5 Mo) | 🟡 | ⬜ |
| T-061 | Upload média — type/taille | 1. `/admin/media` → uploader un type non autorisé, puis un fichier > 25 Mo | Types autorisés : image/video/audio/pdf ; au-delà de 25 Mo → rejet avec limite | 🟡 | ⬜ |
| T-062 | Double soumission | 1. Soumettre un formulaire → cliquer 2× très vite | Une seule soumission (bouton désactivé/anti-rebond) ; pas de doublon créé | 🟡 | ⬜ |
| T-063 | Caractères spéciaux | 1. Saisir accents, emojis 🎉, texte très long dans nom/description | Stockés et réaffichés correctement, sans casser la mise en page | 🟢 | ⬜ |
| T-064 | Conservation après erreur | 1. Remplir un formulaire long → provoquer une erreur de validation | Les champs déjà saisis ne sont pas vidés | 🟡 | ⬜ |
| T-065 | Import annuaire — champs | 1. `/admin/directory` → région + type + mot-clé → Rechercher | Résultats Google Places dédoublonnés (badge « déjà importé ») ; sélection plafonnée (cap d'import) | 🟡 | ⬜ |

### M4 — Parcours critiques (Core Flows)

#### Flow A — Don (argent) 🔴

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-080 | Happy path don | 1. `/besoins/:id` → 2. Choisir un montant préréglé (ex. 10 000 FCFA) → 3. Choisir Wave → Donner → 4. Régler sur Bictorys (sandbox) | Redirection vers le checkout Bictorys ; après paiement, donation `status=paid`, `raisedAmount` et `donorsCount` mis à jour | 🔴 | ⬜ |
| T-081 | Montants préréglés | 1. Vérifier les boutons de montant | Exactement 5 000 / 10 000 / 25 000 / 50 000 / 100 000 / 200 000 FCFA | 🟡 | ⬜ |
| T-082 | Cas limites montant | 1. Montant custom = min autorisé, puis max autorisé, puis 0 / négatif | Min/max acceptés ; 0 et négatif refusés (validation serveur dans `createBictorysCharge`) | 🔴 | ⬜ |
| T-083 | Rate-limit | 1. Lancer > 20 tentatives de charge en moins d'1 h pour un même utilisateur | La 21e est bloquée par le rate-limit, message explicite | 🟡 | ⬜ |
| T-084 | Interruption checkout | 1. Lancer un don → fermer l'onglet Bictorys avant paiement → revenir sur `/besoins/:id` | Aucune incrémentation du montant ; donation reste `pending` ; pas de double comptage | 🔴 | ⬜ |
| T-085 | Webhook idempotent | 1. Simuler la réception du webhook deux fois pour la même transaction | Le montant n'est crédité **qu'une fois** (signature HMAC vérifiée) | 🔴 | ⬜ |
| T-086 | Paiements désactivés | 1. `VITE_BICTORYS_ENABLED=false` → ouvrir `/besoins/:id` | Le widget indique « bientôt » / désactivé, aucun appel de charge | 🟡 | ⬜ |
| T-087 | Erreur réseau pendant don | 1. Couper le réseau juste après « Donner » | Message d'erreur gracieux, possibilité de réessayer, pas de freeze UI | 🟡 | ⬜ |

#### Flow B — Onboarding → page organisation → modération 🔴

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-090 | Création de page | 1. Connecté → `/dashboard/pages/new` → 2. Type + nom + région + description (+ localisation si structure) → Créer | Organisation créée en `status=pending` ; visible dans « Mes organisations » du dashboard | 🔴 | ⬜ |
| T-091 | Modération : approbation | 1. Admin → `/admin/moderation` → onglet pages → Approuver la page créée | `status=active` ; la page devient publique sur `/structures/:id` ; action audit-loggée | 🔴 | ⬜ |
| T-092 | Modération : rejet | 1. Admin → Rejeter une page pending | `status=suspended` ; non publique ; audit-loggée | 🟡 | ⬜ |
| T-093 | Gestion de page | 1. Propriétaire → `/dashboard/pages/:id` → modifier description + logo → Enregistrer | Modifications persistées ; logo uploadé visible | 🟡 | ⬜ |
| T-094 | Interruption création | 1. Remplir partiellement la création → fermer l'onglet → rouvrir `/dashboard/pages/new` | Pas de page fantôme créée ; comportement défini (formulaire vierge) | 🟢 | ⬜ |

#### Flow C — Recherche fédérée → détail 🔴

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-100 | Recherche happy path | 1. `/` → barre de recherche → saisir un terme → Entrée | `/recherche?...` affiche des résultats multi-types pertinents | 🔴 | ⬜ |
| T-101 | Filtres par type | 1. `/recherche` → filtrer par « Médicaments » | Seuls les résultats du type sélectionné s'affichent ; compteur de facettes cohérent | 🟡 | ⬜ |
| T-102 | Recherche sans résultat | 1. Rechercher une chaîne improbable (`zzzqqq`) | Empty state utile (« aucun résultat »), pas de page blanche | 🟡 | ⬜ |
| T-103 | Fallback Typesense → mock | 1. Typesense non configuré/indisponible → rechercher | La recherche bascule sur l'index mock embarqué sans erreur visible | 🟡 | ⬜ |
| T-104 | Lien résultat → détail | 1. Cliquer un résultat médicament/pathologie/article | Ouvre la page de détail correspondante (`/medicaments/:slug`, etc.) | 🟡 | ⬜ |

#### Flow D — Annuaire : import → claim → approbation 🟡

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-110 | Import Places | 1. Admin → `/admin/directory` → rechercher → sélectionner → Importer | Organisations créées `source=imported`, `claimStatus=unclaimed`, données Places (tel/horaires/coords) ; import audit-loggé | 🟡 | ⬜ |
| T-111 | Dédoublonnage | 1. Relancer un import sur les mêmes lieux | Les lieux déjà importés sont marqués et non recréés (clé `placeId`) | 🟡 | ⬜ |
| T-112 | Demande de claim | 1. Utilisateur → page `/structures/:id` non réclamée → demander le claim + justification | `claimRequest` créé en `pending` ; visible dans « Claims » du dashboard | 🟡 | ⬜ |
| T-113 | Approbation claim | 1. Admin → `/admin/moderation` → onglet claims → Approuver | `claimStatus=claimed`, `ownerUid` = demandeur ; audit-loggé | 🟡 | ⬜ |
| T-114 | Carte : marqueurs | 1. `/carte` → vérifier marqueurs et filtres région/type | Marqueurs distincts selon statut (réclamé/non réclamé) ; clic carte ↔ liste synchronisés | 🟢 | ⬜ |
| T-115 | Géolocalisation distance | 1. `/carte` → autoriser la localisation | Tri par distance (haversine) + libellé de distance ; refus géré sans casse | 🟢 | ⬜ |

#### Flow E — Messagerie 🟡

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-120 | Envoi de message | 1. `/messages` → ouvrir/créer une conversation → saisir → Envoyer | Message ajouté à `conversations/{id}/messages` avec `senderUid` = utilisateur ; affiché immédiatement | 🟡 | ⬜ |
| T-121 | Message vide / trop long | 1. Envoyer vide, puis > 5000 caractères | Vide refusé ; au-delà de 5000 refusé (borne `messageText`) | 🟢 | ⬜ |

### M5 — Affichage & Rendu visuel

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-140 | Pas de texte tronqué/débordant | 1. Parcourir les cartes et détails | Aucun texte coupé ou débordant de son conteneur | 🟢 | ⬜ |
| T-141 | Images chargées | 1. Parcourir Home, listes, détails | Toutes les images se chargent (aucune image cassée) | 🟡 | ⬜ |
| T-142 | Empty states | 1. Afficher des listes vides (dashboard sans favoris, recherche sans résultat) | Message d'état vide utile, jamais de page blanche | 🟡 | ⬜ |
| T-143 | Skeletons / chargement | 1. Ouvrir une page qui fetch (dashboard, détail) | Skeleton/spinner (`LoadingState`) pendant le chargement, puis contenu | 🟢 | ⬜ |
| T-144 | Formats FCFA/dates/distance | 1. Vérifier montants, dates et distances | FCFA formaté, dates en français, distances en km (`src/lib/format`) | 🟡 | ⬜ |
| T-145 | Textes longs | 1. Créer un nom/description très long | La mise en page tient (ellipsis/retour à la ligne), pas de casse | 🟢 | ⬜ |
| T-146 | Modales : Escape & clic extérieur | 1. Ouvrir une modale (nouveau thread, confirmation) → Échap puis clic extérieur | La modale se ferme par les deux moyens | 🟡 | ⬜ |
| T-147 | Barre de progression don | 1. `/besoins/:id` avec `raisedAmount` partiel | La barre reflète `raisedAmount/targetAmount` correctement | 🟡 | ⬜ |
| T-148 | Pas de scroll horizontal | 1. Parcourir chaque page | Aucun scroll horizontal non voulu | 🟢 | ⬜ |
| T-149 | Dark mode (si présent) | 1. Activer le thème sombre (sidebar admin notamment) | Tous les éléments restent lisibles, contrastes corrects | 🟢 | ⬜ |
| T-150 | Stabilité visuelle (CLS) | 1. Recharger les pages riches en images | Le contenu ne « saute » pas à l'arrivée des images (dimensions réservées) | 🟢 | ⬜ |
| T-151 | ErrorBoundary | 1. Provoquer une erreur de rendu (donnée malformée) | Écran « Une erreur est survenue » + bouton de reprise, **pas d'écran blanc** | 🟡 | ⬜ |

### M6 — Responsive & Cross-browser

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-160 | Desktop 1920/1440/1280 | 1. Tester les pages clés à ces largeurs | Mise en page correcte, pas de chevauchement | 🟡 | ⬜ |
| T-161 | Tablette 768/1024 | 1. Tester en tablette | Adaptation cohérente des grilles et menus | 🟡 | ⬜ |
| T-162 | Mobile 375/390/414 | 1. Tester les parcours clés au doigt | Utilisable, pas de contenu coupé, cibles tactiles suffisantes | 🔴 | ⬜ |
| T-163 | Bascule menu < 1280px | 1. Réduire la fenêtre sous 1280px | Le menu principal bascule en hamburger | 🟡 | ⬜ |
| T-164 | Chrome (desktop) | 1. Exécuter le smoke test | Fonctionnel | 🟡 | ⬜ |
| T-165 | Firefox | 1. Smoke test | Fonctionnel | 🟡 | ⬜ |
| T-166 | Safari (macOS) | 1. Smoke test | Fonctionnel | 🟡 | ⬜ |
| T-167 | Edge | 1. Smoke test | Fonctionnel | 🟢 | ⬜ |
| T-168 | Safari iOS | 1. Smoke test mobile + don | Fonctionnel, carte et formulaires utilisables | 🔴 | ⬜ |
| T-169 | Chrome Android | 1. Smoke test mobile + don | Fonctionnel | 🔴 | ⬜ |
| T-170 | Zoom 200% / paysage | 1. Zoom navigateur 200% puis mobile en paysage | Contenu accessible et lisible, pas de casse | 🟢 | ⬜ |

### M7 — Performance & Chargement

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-180 | Accueil < 3 s | 1. Charger `/` en connexion standard (cache vide) | Affichage utile en moins de 3 s | 🟡 | ⬜ |
| T-181 | Aucune 500 | 1. Parcourir toutes les pages | Aucune page ne renvoie une erreur 500 | 🔴 | ⬜ |
| T-182 | Lazy-loading des pages | 1. Naviguer entre routes | Chargement progressif (Suspense) sans bloquer l'UI | 🟢 | ⬜ |
| T-183 | Dataset médicaments | 1. Mode fallback (Firestore vide) → ouvrir une page médicaments | Le gros dataset (~848 Ko) n'est chargé qu'au besoin (lazy), pas sur chaque page | 🟡 | ⬜ |
| T-184 | UI non bloquante | 1. Lancer une recherche/un import lourd | L'interface reste réactive (pas de freeze) | 🟡 | ⬜ |
| T-185 | Pagination | 1. `/admin/media` et listes de contenu avec beaucoup d'éléments | Pagination/chargement par lots sans dégradation | 🟢 | ⬜ |
| T-186 | Pas de timeout normal | 1. Usage normal des appels Firestore/API | Aucun timeout en conditions normales | 🟡 | ⬜ |
| T-187 | Assets optimisés | 1. Inspecter le build de prod | JS/CSS minifiés, images compressées | 🟢 | ⬜ |

### M8 — Sécurité (tests fonctionnels)

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-200 | URL admin par user normal | 1. Connecté `patient_public` → saisir `/admin/users` dans l'URL | Accès refusé côté UI **et** les requêtes Firestore sont rejetées par les règles | 🔴 | ⬜ |
| T-201 | Permission fine | 1. Connecté `editor` → ouvrir `/admin/users` (requiert `users.manage`) | « Accès réservé » ; l'item n'apparaît pas dans la sidebar | 🔴 | ⬜ |
| T-202 | Élévation de rôle bloquée | 1. `admin` tente de s'attribuer `super_admin` ; 2. tenter de modifier `role` via requête directe | Refusé : seul `super_admin` gère les rôles (`roles.manage`) ; règles Firestore bloquent | 🔴 | ⬜ |
| T-203 | super_admin protégé | 1. Tenter de suspendre/rétrograder le compte super_admin | Action impossible (non assignable / non suspensible) | 🔴 | ⬜ |
| T-204 | Écriture sous identité d'autrui | 1. Tenter de créer un post/message avec un `authorUid`/`senderUid` ≠ soi | Rejeté par `firestore.rules` (`== request.auth.uid`) | 🔴 | ⬜ |
| T-205 | Claim non auto-approuvé | 1. Utilisateur tente de passer son propre claim à `approved` | Refusé ; seul un admin approuve | 🔴 | ⬜ |
| T-206 | En-têtes de sécurité / CSP | 1. Inspecter les en-têtes de réponse (commit `35cde3b`) | CSP présente avec `script-src` restreint, plus X-Frame-Options/X-Content-Type-Options | 🟡 | ⬜ |
| T-207 | HTTPS forcé | 1. Accéder en `http://` | Redirection vers HTTPS | 🟡 | ⬜ |
| T-208 | Secrets non exposés | 1. Inspecter le bundle front | Aucune clé secrète Bictorys/Places côté client ; seules les clés publiques restreintes (Places restreinte, Typesense search-only) | 🔴 | ⬜ |
| T-209 | Mots de passe jamais en clair | 1. Champs mdp + DevTools/logs | Champs masqués ; aucun mdp en clair dans les requêtes/console | 🟡 | ⬜ |
| T-210 | Rate-limit login | 1. Multiplier les tentatives de connexion échouées | Limitation/temporisation appliquée (Firebase Auth) | 🟡 | ⬜ |
| T-211 | Rate-limit dons | 1. Cf. T-083 (> 20 charges/h) | Bloqué côté Cloud Function | 🟡 | ⬜ |
| T-212 | Webhook signature | 1. Envoyer un webhook Bictorys avec signature invalide | Rejeté (HMAC-SHA256 non vérifiée) ; aucun crédit | 🔴 | ⬜ |
| T-213 | Suppression média audit-loggée | 1. Admin supprime un média | Suppression enregistrée dans `auditLogs` | 🟢 | ⬜ |

### M9 — Emails & Notifications

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-230 | Email reset mdp | 1. Demander un reset (T-029) | Email Firebase reçu rapidement, objet clair | 🔴 | ⬜ |
| T-231 | Liens email valides | 1. Cliquer le lien du mail de reset | Mène à la page de réinitialisation officielle, sans erreur | 🔴 | ⬜ |
| T-232 | Lisibilité email | 1. Ouvrir sur Gmail, Outlook, Apple Mail | Email lisible et bien formé sur les 3 clients | 🟢 | ⬜ |
| T-233 | Email vérification (si activé) | 1. S'inscrire → vérifier si un email de vérification part | **À confirmer** : la vérification email est-elle activée dans Firebase ? (voir zones d'ombre) | 🟡 | ⬜ |
| T-234 | Toasts in-app | 1. Effectuer une action (sauvegarde, erreur) | Toast (`useToast`) affiché puis disparaît ; message correct | 🟢 | ⬜ |
| T-235 | Support Chatwoot | 1. Connecté → ouvrir le widget de support | Widget chargé, utilisateur identifié (nom/email) ; réinitialisé au logout | 🟢 | ⬜ |
| T-236 | Pas de spam | 1. Vérifier que les emails Firebase n'arrivent pas en spam | Email en boîte de réception (vérif SPF/DKIM du domaine d'envoi) | 🟢 | ⬜ |

### M10 — Accessibilité

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-250 | Navigation clavier complète | 1. Parcourir un parcours clé sans souris (Tab/Enter/Escape) | Toutes les actions réalisables au clavier | 🟡 | ⬜ |
| T-251 | Focus visible | 1. Tabuler sur les éléments interactifs | Indicateur de focus visible partout | 🟡 | ⬜ |
| T-252 | Ordre de tabulation | 1. Tabuler sur les formulaires | Ordre logique, cohérent avec l'ordre visuel | 🟡 | ⬜ |
| T-253 | Contraste texte normal | 1. Mesurer le contraste du texte courant | ≥ 4.5:1 | 🟡 | ⬜ |
| T-254 | Contraste texte large | 1. Mesurer titres/gros texte | ≥ 3:1 | 🟢 | ⬜ |
| T-255 | Labels de formulaire | 1. Inspecter chaque input | Label associé (`for`/`id` ou `aria-label`) | 🟡 | ⬜ |
| T-256 | Alt des images | 1. Inspecter images informatives vs décoratives | Informatives : alt descriptif (médias ont `altText`) ; décoratives : `alt=""` | 🟡 | ⬜ |
| T-257 | ARIA sur composants custom | 1. Inspecter menus/modales/onglets | Rôles/labels ARIA présents | 🟢 | ⬜ |
| T-258 | Zoom texte 200% | 1. Zoom texte à 200% | Contenu lisible et utilisable | 🟢 | ⬜ |
| T-259 | Info non portée que par la couleur | 1. Vérifier statuts (urgence, claim, rôle) | L'information passe aussi par un libellé/icône, pas que par la couleur | 🟡 | ⬜ |
| T-260 | prefers-reduced-motion | 1. Activer la réduction de mouvement OS | Animations réduites/désactivées | 🟢 | ⬜ |
| T-261 | Structure des titres | 1. Inspecter h1–h6 par page | Hiérarchie correcte, un seul h1 pertinent | 🟢 | ⬜ |
| T-262 | Lecteur d'écran | 1. Parcourir avec VoiceOver/NVDA une page clé | Contenu et actions annoncés de façon compréhensible | 🟢 | ⬜ |

### M11 — SEO & Métadonnées

| # | Test | Étapes | Résultat attendu | Sévérité | Status |
|---|---|---|---|---|---|
| T-280 | Title unique | 1. Inspecter `<title>` sur plusieurs pages (`SEOHead`/Helmet) | Titre unique et descriptif par page | 🟡 | ⬜ |
| T-281 | Meta description | 1. Inspecter la meta description | Unique et pertinente par page | 🟢 | ⬜ |
| T-282 | Open Graph | 1. Inspecter les balises OG (+ images via `og:images`) | OG title/description/image présents et corrects | 🟢 | ⬜ |
| T-283 | JSON-LD | 1. Inspecter les données structurées sur les détails | JSON-LD valide pour le type de contenu | 🟢 | ⬜ |
| T-284 | noindex 404 | 1. Inspecter la 404 | Balise `noindex` présente | 🟡 | ⬜ |
| T-285 | sitemap.xml | 1. Ouvrir `/sitemap.xml` (généré par `npm run sitemap`) | Présent et listant les URLs publiques | 🟡 | ⬜ |
| T-286 | robots.txt | 1. Ouvrir `/robots.txt` | Présent et correctement configuré | 🟢 | ⬜ |
| T-287 | URLs propres | 1. Vérifier les URLs (`/medicaments/:slug`, etc.) | Lisibles, cohérentes, en français | 🟢 | ⬜ |
| T-288 | Prerender SEO | 1. Voir le rendu statique (`npm run prerender`) | Les pages prérendues contiennent le contenu (mock seedé avant build) | 🟡 | ⬜ |

---

## 3. Tests de régression prioritaires

Zones où une modification récente peut casser l'existant — à rejouer **après chaque déploiement** :

| Priorité | Zone à risque | Tests à rejouer | Pourquoi |
|---|---|---|---|
| 🔴 1 | Règles Firestore (`firestore.rules`) | Suite `npm run test:rules` + T-200→T-205, T-212 | Cœur de la sécurité ; suite de régression dédiée existe (commit `7764bdc`). |
| 🔴 2 | Couche dons durcie (commit `d6f0e79`) | Flow A complet (T-080→T-087), T-211, T-212 | Touche l'argent ; validation montant + rate-limit + webhook. |
| 🟡 3 | CSP / `script-src` (commit `35cde3b`) | T-206, T-055 (XSS), smoke complet | Une CSP trop stricte peut casser le chargement de scripts légitimes (Chatwoot, Places). |
| 🟡 4 | Registre de contenu refacto (commit `c123809`) | CRUD des 8 types via `/admin/content/:type` (T-050) + détails publics | Le 544-line monolithe a été éclaté par type ; risque de régression par type. |
| 🟡 5 | Import annuaire plafonné/audité (commit `90ff623`) | T-065, T-110, T-111, T-213 | Cap d'import + audit log ; vérifier que le plafond et le dédoublonnage tiennent. |
| 🟡 6 | `siteConfig` (fichiers non commités) | T-007, T-008 (footer/menus dynamiques), `/admin/settings`, `/admin/menus` | Nouveaux services `siteConfig.ts`/`siteConfigAdmin.ts`/`useSiteConfig.ts` non encore en historique. |

---

## 4. Matrice de couverture

| Module | Nb tests | 🔴 Critiques | 🟡 Majeurs | 🟢 Mineurs | Couverture estimée |
|---|---|---|---|---|---|
| M1 — Navigation | 13 | 2 | 8 | 3 | 90% |
| M2 — Auth & Compte | 18 | 8 | 10 | 0 | 95% |
| M3 — Formulaires | 16 | 4 | 11 | 1 | 90% |
| M4 — Parcours critiques | 26 | 7 | 15 | 4 | 95% |
| M5 — Affichage | 12 | 0 | 6 | 6 | 85% |
| M6 — Responsive/Cross-browser | 11 | 3 | 6 | 2 | 85% |
| M7 — Performance | 8 | 1 | 4 | 3 | 75% |
| M8 — Sécurité | 14 | 8 | 5 | 1 | 90% |
| M9 — Emails & Notifications | 7 | 2 | 1 | 4 | 70% |
| M10 — Accessibilité | 13 | 0 | 7 | 6 | 80% |
| M11 — SEO | 9 | 0 | 4 | 5 | 85% |
| **TOTAL** | **147** | **35** | **77** | **35** | **≈ 87%** |

> La couverture estimée reflète la part des comportements observables couverts par le cahier ; les zones d'ombre (section 6) plafonnent certains modules (M7, M9) tant qu'elles ne sont pas levées.

---

## 5. Smoke test (pré-prod)

Les **18 tests essentiels** à passer avant chaque mise en production (priorité argent → données → parcours principal). Référencent les IDs du cahier.

| # | Smoke | Réf. | Sévérité |
|---|---|---|---|
| S-01 | L'accueil `/` charge (titre + nav) | T-001 | 🔴 |
| S-02 | Connexion valide | T-026 | 🔴 |
| S-03 | Identifiants invalides → erreur générique | T-027 | 🔴 |
| S-04 | Inscription valide bout-en-bout | T-020 | 🔴 |
| S-05 | Reset mot de passe : email reçu | T-029 | 🔴 |
| S-06 | Recherche fédérée renvoie des résultats | T-100 | 🔴 |
| S-07 | Page de détail (médicament) s'affiche | T-104 | 🟡 |
| S-08 | Carte `/carte` affiche des marqueurs | T-114 | 🟡 |
| S-09 | Don bout-en-bout (sandbox Bictorys) | T-080 | 🔴 |
| S-10 | Montants de don corrects (5k→200k) | T-081 | 🟡 |
| S-11 | Webhook crédite une seule fois | T-085 | 🔴 |
| S-12 | Création de page → status pending | T-090 | 🔴 |
| S-13 | Modération : approbation publie la page | T-091 | 🔴 |
| S-14 | Route protégée → redirection login | T-033 | 🔴 |
| S-15 | URL admin par user normal → refus | T-200 | 🔴 |
| S-16 | 404 sur URL inconnue | T-009 | 🔴 |
| S-17 | CSP / en-têtes de sécurité présents | T-206 | 🟡 |
| S-18 | Aucune page clé ne renvoie 500 | T-181 | 🔴 |

> Voir `e2e/smoke/` pour les squelettes Playwright correspondants (à compléter — actuellement `test.fixme`).

---

## 6. Zones d'ombre à clarifier

Points non tranchés dans le code — à confirmer avec l'équipe **avant** d'écrire des tests définitifs :

1. **Suppression de compte** — aucun flux de suppression/purge RGPD détecté. Existe-t-il ? Sinon, à planifier.
2. **Vérification d'email** — `sendEmailVerification` est-il activé dans la console Firebase ? Si oui, l'accès est-il bloqué tant que l'email n'est pas vérifié ? (impacte T-233).
3. **Sandbox Bictorys** — un environnement de test/sandbox est-il disponible pour rejouer le Flow A sans paiement réel ? Sans lui, S-09/T-080 ne sont testables qu'en prod contrôlée.
4. **Admin des dons** — aucun écran admin de suivi des donations (`donations`) n'existe. Le reporting financier se fait-il ailleurs (Firestore direct / Bictorys dashboard) ?
5. **Modules admin sans page** — la sidebar liste `redirects`, `emails`, `appearance`, `backups` mais **aucune route** n'existe pour eux dans `App.tsx`. Comportement attendu au clic ? (à l'inverse, `comments` et `audit-log` ont bien une page).
6. **robots.txt / canonical** — confirmer leur présence et configuration en prod (non vérifiés dans le repo).
7. **i18n** — l'app est 100% française, sans librairie i18n. Confirmer qu'aucun multilingue n'est prévu (sinon ajouter un module de tests langue).
8. **Notifications in-app persistées** — au-delà des toasts éphémères, existe-t-il un centre de notifications ? Non détecté.

---

## 7. Annexe A — Exécution automatisée & correctifs (2026-06-17)

### 🔴 Bug critique trouvé ET corrigé — élévation de privilèges (`firestore.rules`)

La suite de régression des règles (`npm run test:rules`) échouait sur 2 invariants de sécurité (cahier **T-202**) : un utilisateur pouvait **s'auto-attribuer `role: "admin"`** à l'inscription et **modifier son propre `role`/`status`**.

- **Cause** : la règle des sous-collections privées `match /users/{uid}/{sub=**}` (wildcard récursif) **aliasait le document de profil `/users/{uid}` lui-même** et accordait `write` inconditionnel au propriétaire, écrasant le verrouillage `role`/`status` du bloc `/users/{uid}`.
- **Correctif** : la règle démarre désormais à un segment de sous-collection — `match /users/{uid}/{collection}/{doc=**}` — donc elle ne peut **jamais** matcher le doc de profil. Les données dashboard (favoris, recherches sauvegardées…) restent couvertes (toujours ≥ 2 segments).
- **Résultat** : suite **25/25 verte**. Les écritures légitimes (création de page → `pending`) restent autorisées (validé par E2E émulateur).

> ⚠️ **ACTION REQUISE** : ce correctif n'est appliqué qu'en local. Il faut **déployer les règles** pour protéger la prod :
> `npm run deploy:rules` (déploie `firestore:rules,firestore:indexes,storage`).

### 🟢 Correctif a11y mineur (cahier T-255)

Labels non associés aux champs (`htmlFor`/`id` manquants) → corrigés sur `CreatePage` (Région, Description) et `Register` (Région). Les lecteurs d'écran annoncent désormais correctement ces champs.

### Suites exécutées (état au 2026-06-17)

| Suite | Commande | Résultat |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ clean |
| Lint | `npm run lint` | ✅ 0 erreur (3 warnings préexistants) |
| Build prod | `npm run build` | ✅ OK |
| Tests unitaires | `npm run test:run` | ✅ 40/40 |
| **Règles Firestore** | `npm run test:rules` | ✅ **25/25** (après correctif) |
| **Smoke E2E (read-only)** | `npm run e2e` | ✅ **11/11** (11 skipped : auth/écriture/sandbox) |
| **Flows auth/écriture E2E** | `npm run e2e:emu` | ✅ **4/4** (émulateurs) |

### Harnais E2E émulateur (nouveau)

`npm run e2e:emu` (→ `scripts/e2e-emulators.sh`) : build avec `VITE_USE_EMULATORS=true`, démarre Auth+Firestore émulateurs, joue `e2e-emu/auth-flows.spec.ts` **sans jamais toucher la prod**. Couvre S-04 (inscription 3 étapes), S-02 (connexion), S-15 (patient_public bloqué de l'admin), S-12 (création page → `pending`). Pré-requis : **JDK 21+** (l'émulateur Firestore l'exige ; le script le détecte/le sélectionne automatiquement).

### Reste bloqué (raisons précises)

| Test | Blocage |
|---|---|
| S-09 / S-11 (don bout-en-bout, webhook) | **Sandbox Bictorys requis** (cf. zone d'ombre §6.3) + secrets Cloud Function. Stubs `e2e/smoke/donation.spec.ts` prêts. |
| S-13 (modération : approbation) | Nécessite un utilisateur **admin** : à ajouter au harnais émulateur via un seed `Authorization: Bearer owner` (REST) ou `firebase-admin`. |
| S-17 (CSP en-têtes) | Validé **statiquement** via `firebase.json` (X-Frame-Options/X-Content-Type/CSP présents) ; non testable via `vite preview` (en-têtes servis par Firebase Hosting, pas par le preview). |
| S-05 (email reset) | L'envoi se confirme côté UI ; la **réception** réelle se vérifie hors Playwright (ou via Auth emulator). |

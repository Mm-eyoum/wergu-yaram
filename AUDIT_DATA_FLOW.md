# AUDIT FETCHING & DATA FLOW — Wergu Yaram

## 1. Mécanismes en présence

| Mécanisme | Présent | Détail |
|-----------|:---:|--------|
| `fetch` / `axios` | ❌ | Aucun appel HTTP custom |
| React Query / SWR | ❌ | Aucune lib de data-fetching |
| Firebase SDK (Auth) | ✅ | `signIn*`, `createUser*`, `onAuthStateChanged`, `signOut`, `resetPassword` |
| Firebase SDK (Firestore) | ⚠️ | Uniquement `users/{uid}` (`setDoc`/`getDoc`) |
| Server actions / loaders | ❌ | SPA cliente pure |
| Sockets / temps réel | ❌ | Pas de `onSnapshot` |
| Polling | ❌ | — |
| Cache / invalidation | ❌ | Aucun |
| Optimistic updates | ❌ | Aucun |
| Mock statique | ✅✅ | **Source principale** du contenu (`src/data/mock*.ts` via `services/content.ts`) |

**Schéma réel de circulation** :

```
CONTENU (médicaments, pathologies, communautés, forum, besoins, événements, partenaires, messages)
   Pages  ──import synchrone──>  services/content.ts  ──>  data/mock*.ts        [JAMAIS de réseau]

AUTH / PROFIL
   Login/Register/Header  ──>  useAuth ──> AuthContext ──> firebase/auth (réseau)
                                              └──> services/users.ts ──> Firestore users/{uid} (réseau)
```

Tout le reste du « flux de données » est **statique, embarqué dans le bundle**.

---

## 2. Tableau des flux critiques

| # | Écran | Action front | Fonction front | « Endpoint » back | Modèle | Rôle | État actuel | Problème | Reco |
|---|-------|--------------|----------------|-------------------|--------|------|-----------|----------|------|
| F1 | Login | Se connecter | `login()` (`AuthContext:75`) | `firebase/auth` | — | tous | ✅ réel | catch générique | logguer, messages fins |
| F2 | Register | Créer compte | `register()` (`AuthContext:80`) | auth + `users/{uid}` | `AppUser` | tous | ✅ réel | `phone` perdu | persister/retirer |
| F3 | Header | Déconnexion | `logout()` (`AuthContext:105`) | `firebase/auth` | — | connecté | ✅ desktop / ❌ mobile | pas de bouton mobile | ajouter au drawer |
| F4 | App init | Charger session | `onAuthStateChanged` (`AuthContext:53`) | auth + `users/{uid}` | `AppUser` | tous | ✅ | fallback `active` trompeur | pas de fallback actif |
| F5 | Dashboard | Afficher stats | — | — | — | connecté | ❌ valeurs en dur (`8/2/3`) | données fictives | brancher Firestore |
| F6 | Forum | Poser une question | — | (devrait: `forumThreads` create) | `ForumThread` | connecté | ❌ bouton mort | non câblé + modèle sans `authorUid` | implémenter |
| F7 | Communauté | Publier / Rejoindre | — | (devrait: `…/posts` create) | `CommunityPost` | connecté | ❌ factice | non câblé | implémenter |
| F8 | Messages | Envoyer message | `onSubmit` (`Messages:114`) | (devrait: `…/messages` create) | `Conversation` | connecté | ❌ vide le draft | non persisté + modèle sans `participants` | implémenter |
| F9 | EquipmentDetail | Faire un don | — | (devrait: paiement + `equipmentNeeds`) | `EquipmentNeed` | donateur | ❌ pas de paiement | non câblé | intégration paiement |
| F10 | Recherche/Forum/Besoins | Filtrer | `useMemo`/`useState` | — (mock) | divers | tous | ✅ mais client-only | non scalable | recherche serveur/index |

---

## 3. Problèmes de data flow

### [DF-01] Mutations non persistées (illusion de fonctionnement)
- **Gravité** : Critique · **Priorité** : P1
- **Zones/fichiers** : `Messages.tsx:114-119` (message), `CommunityComposer.tsx` (post), `DonationWidget.tsx:85` (don), boutons Forum/Communauté.
- **Description** : ces actions modifient au mieux un état **local** (ou rien), puis l'effacent. Rien n'atteint Firestore. Après rechargement, tout disparaît.
- **Impact** : l'utilisateur croit avoir agi (message envoyé, don fait). **Particulièrement grave pour le don.**
- **Reproduire** : envoyer un message → il n'apparaît pas dans le fil ; recharger → draft perdu.
- **Reco** : implémenter les écritures Firestore + feedback (succès/erreur) ; pour le don, intégration paiement réelle.

### [DF-02] Contenu 100 % statique, lecture synchrone
- **Gravité** : Critique · **Priorité** : P1
- **Fichier** : `services/content.ts` (ré-export `data/mock*.ts`)
- **Description** : tout le contenu est servi depuis le bundle, de façon synchrone. Aucune donnée n'est jamais rafraîchie ; le même contenu pour tous, figé.
- **Impact** : produit non administrable, non évolutif sans redéploiement ; pas de personnalisation réelle.
- **Reco** : introduire une couche async (cf. ARCHITECTURE) + TanStack Query ; brancher Firestore.

### [DF-03] Absence d'états loading/error sur les données
- **Gravité** : Moyenne · **Priorité** : P2
- **Description** : comme le contenu est synchrone, il n'existe ni spinner ni gestion d'échec réseau pour le contenu. À la migration, ces états seront **à créer partout** (18 pages).
- **Reco** : prévoir dès maintenant le contrat loading/error/empty dans la couche data.

### [DF-04] Pas d'invalidation ni de rafraîchissement post-mutation
- **Gravité** : Moyenne · **Priorité** : P2
- **Description** : même pour l'auth, après `register()` on refait un `fetchUserProfile` manuel (`AuthContext:92`) — pattern correct mais artisanal. Aucune stratégie de cache/invalidation généralisée.
- **Reco** : centraliser via TanStack Query (`invalidateQueries` après mutation).

### [DF-05] Recherche & filtres uniquement côté client
- **Gravité** : Moyenne · **Priorité** : P2
- **Fichiers** : `Forum.tsx:37-46`, `EquipmentList.tsx` (filtres), `SearchResults.tsx` (index mock).
- **Description** : la recherche fédérée et les filtres parcourent des tableaux en mémoire. Ne passera pas à l'échelle ; pas de pagination.
- **Reco** : recherche côté serveur (Firestore queries + index, ou service de recherche) et pagination.

### [DF-06] Gestion d'expiration de session non explicite
- **Gravité** : Faible · **Priorité** : P3
- **Description** : on s'appuie sur `onAuthStateChanged`. Aucune gestion fine d'expiration de token sur des appels (il n'y en a pas), ni de message « session expirée ».
- **Reco** : à traiter quand de vrais appels Firestore liront/écriront des données protégées.

---

## 4. Interconnexions cassées ou fragiles (récap)

| Interconnexion | État | Cause |
|----------------|------|-------|
| Front → écriture posts/threads | ❌ cassée | non câblé + modèle sans `authorUid` |
| Front → messagerie | ❌ cassée | `onSubmit` factice + modèle sans `participants` |
| Front → don/paiement | ❌ cassée | aucun provider de paiement |
| Front → contenu Firestore | ❌ absente | front lit le mock |
| Dashboard → données utilisateur | ⚠️ fragile | stats en dur, seuls `displayName`/`interests` viennent du profil |
| Auth → profil | ✅ OK | mais fallback trompeur sur erreur |

---

## 5. Actions « qui semblent fonctionner mais ne persistent rien »

1. **Envoi de message** (`Messages.tsx`) — efface le champ, n'envoie rien.
2. **Publication communautaire** (`CommunityComposer`) — bouton « Publier » inactif.
3. **Don** (`DonationWidget`) — calcule un montant, aucun paiement.
4. **Filtres/recherche** — fonctionnent visuellement mais sur données figées.
5. **Dashboard** — affiche des compteurs fixes présentés comme personnels.

**Score (data flow) : 38/100.** Le seul flux réellement opérationnel est l'authentification/profil. Tout le reste est statique ou factice, sans cache, sans gestion async, avec plusieurs mutations donnant une fausse impression de succès — c'est le point le plus critique du produit.

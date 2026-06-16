# AUDIT BACK-END — Wergu Yaram

> Le « back-end » se résume à **Firebase** : Authentication + Firestore, sans serveur applicatif ni Cloud Functions. Il n'y a donc **pas d'API REST/GraphQL/RPC** custom. Les « endpoints » sont les **collections Firestore** et leurs règles d'accès.

## 1. Cartographie des « endpoints » (collections Firestore)

Source : `firestore.rules` + `src/services/`.

| Collection | Lecture | Écriture | Service front | Réellement utilisée par l'app ? |
|------------|---------|----------|---------------|:---:|
| `users/{uid}` | owner + admin | create owner / update owner (role+status figés) / delete admin | `services/users.ts` | ✅ Oui |
| `medications/{doc}` | public | admin | — (mock) | ❌ Non (seed only) |
| `pathologies/{doc}` | public | admin | — (mock) | ❌ |
| `articles/{doc}` | public | admin | — (mock) | ❌ |
| `facilities/{doc}` | public | admin | — (mock) | ❌ |
| `partners/{doc}` | public | admin | — (mock) | ❌ |
| `events/{doc}` | public | admin | — (mock) | ❌ |
| `equipmentNeeds/{doc}` | public | admin | — (mock) | ❌ |
| `communities/{c}` | public | admin | — (mock) | ❌ |
| `communities/{c}/posts/{p}` | public | create: signed-in / update+delete: owner\|admin | — (aucune écriture) | ❌ |
| `forumThreads/{t}` | public | create: signed-in / update+delete: owner\|admin | — (aucune écriture) | ❌ |
| `conversations/{c}` | participants | participants | — (mock) | ❌ |
| `conversations/{c}/messages/{m}` | participants | create: participants | — (aucune écriture) | ❌ |
| `{document=**}` | **deny** | **deny** | — | ✅ (fallback sain) |

**Constat** : sur 13 collections déclarées, **une seule** (`users`) est réellement lue/écrite par l'application. Toutes les autres sont prévues par les règles et le seed mais **jamais appelées** par le front (qui lit le mock). C'est l'inverse du symptôme habituel : ici, ce ne sont pas les endpoints qui manquent, c'est le **front qui ne les appelle pas**.

---

## 2. Services analysés

### `src/services/firebase.ts`
- Initialise l'app Firebase **uniquement si** `isFirebaseConfigured` (clé + projectId présents) — `:16,22`. Sinon `auth`/`db` restent `undefined`.
- ✅ Pattern de dégradation propre : l'app ne crashe pas sans config.
- ⚠️ `getFirestore`/`getAuth` chargés à l'init → contribuent au chunk Firebase de 442 kB (cf. PERFORMANCE).

### `src/services/users.ts`
- `defaultStatusForRole` (`:7`) : patient → `active`, autres → `pending`. ✅ Logique métier correcte.
- `createUserProfile` (`:19`) : `setDoc(users/{uid})` avec `role`, `status` calculé serveur-side-ish (mais côté client), `createdAt: serverTimestamp()`. ✅
- `fetchUserProfile` (`:36`) : lit le profil, **auto-crée** un profil patient au premier login Google (`:48-55`). ⚠️ voir BE-03.

### `src/services/content.ts`
- **Pure façade de ré-export du mock** : aucune requête Firestore. C'est le point de bascule futur vers de vraies lectures (cf. ARCHITECTURE).

---

## 3. Problèmes back-end

### [BE-01] Modèles incompatibles avec les règles de sécurité
- **Gravité** : Haute · **Priorité** : P1 · **Catégorie** : Modèle / sécurité
- **Fichiers** : `src/types/domain.ts:129-138` (`CommunityPost`), `:226-238` (`ForumThread`), `:240-251` (`Conversation`)
- **Description** :
  - `CommunityPost` et `ForumThread` exposent `author: { name, role? }` mais **pas d'`authorUid`**. Or `firestore.rules:52,59` exigent `resource.data.authorUid` pour autoriser update/delete. → impossible d'écrire des posts conformes aux règles.
  - `Conversation` n'a **pas de champ `participants`**, alors que `firestore.rules:64-67,72` reposent entièrement dessus. → la messagerie réelle est inopérante en l'état.
- **Impact** : dès qu'on branchera l'écriture, posts/threads/messages échoueront ou seront non sécurisés.
- **Recommandation** : ajouter `authorUid: string` (posts/threads) et `participants: string[]` (Conversation) ; aligner le seed et le front.
- **Effort** : Faible · **Quick win** : Oui

### [BE-02] Validation côté serveur insuffisante (mass-assignment)
- **Gravité** : Moyenne · **Priorité** : P2 · **Catégorie** : Validation
- **Fichier** : `firestore.rules` (collections posts/threads/conversations)
- **Description** : les règles `create` ne valident **ni la forme ni les champs** des documents (pas de `request.resource.data.keys().hasOnly([...])`, pas de contrôle de type/longueur). Un client peut écrire des champs arbitraires (ex. compteurs `likes`, `votes`, `verified`, `solved` truqués).
- **Impact** : intégrité des données (compteurs gonflés, faux badges « vérifié »).
- **Recommandation** : ajouter une validation stricte des clés et des types dans chaque `create`/`update`.
- **Effort** : Moyen · **Quick win** : Non

### [BE-03] Auto-provisioning silencieux du profil
- **Gravité** : Faible · **Priorité** : P2 · **Catégorie** : Auth/UX
- **Fichier** : `src/services/users.ts:48-55`
- **Description** : au premier login Google sans profil, un profil `patient_public/active` est créé automatiquement. C'est pratique, mais un utilisateur qui voulait s'inscrire comme « structure » via Google sera silencieusement classé patient, sans choix de rôle.
- **Recommandation** : rediriger les nouveaux comptes Google vers une étape « complétez votre profil / choisissez votre rôle ».
- **Effort** : Moyen · **Quick win** : Non

### [BE-04] Gestion d'erreurs muette et fallback trompeur
- **Gravité** : Moyenne · **Priorité** : P2 · **Catégorie** : Robustesse
- **Fichiers** : `src/context/AuthContext.tsx:57-66`, `src/services/users.ts:37-44`
- **Description** : si `fetchUserProfile` échoue, le `catch` renvoie un utilisateur **`patient_public/active` par défaut**. Un compte réellement `suspended` ou d'un autre rôle pourrait, en cas d'erreur de lecture, être traité comme patient actif. Les erreurs ne sont ni loggées ni remontées.
- **Impact** : incohérence de rôle/statut en cas d'incident réseau ; débogage difficile (aucune trace).
- **Recommandation** : ne pas fabriquer un statut « actif » par défaut sur erreur ; afficher un état d'erreur/retry ; logger (Sentry/Crashlytics).
- **Effort** : Faible-Moyen · **Quick win** : partiel

### [BE-05] `seed.ts` en SDK client + premier admin non provisionné
- **Gravité** : Moyenne · **Priorité** : P2 · **Catégorie** : Ops/Sécurité
- **Fichier** : `scripts/seed.ts`
- **Description** : le seed utilise le **SDK client** Firebase, soumis aux règles (`write: if isAdmin()`). Or aucun admin n'existe au départ (œuf/poule). Le contournement implicite est de **relâcher temporairement les règles** ou d'utiliser l'émulateur — risque d'oubli de re-sécurisation. Aucun script ne crée le premier admin.
- **Recommandation** : migrer le seed vers le **Firebase Admin SDK** (compte de service, hors règles) ; ajouter un script `set-admin` documenté ; documenter dans le README.
- **Effort** : Moyen · **Quick win** : Non (mais doc = faible)

---

## 4. Performance back-end

- **Pas de N+1, pas de requête lourde** aujourd'hui… parce qu'il n'y a quasiment pas de requêtes (mock).
- **Risques à la migration** : absence de **pagination** (listes `medications`, `forumThreads`, `equipmentNeeds` lues en entier), absence d'**index composites** déclarés (`firestore.indexes.json` inexistant), lecture du contenu public sans cache.
- **Recommandation** : prévoir pagination (`limit`/`startAfter`), index, et règles de cache dès la conception des requêtes réelles.

---

## 5. Matrice des endpoints (collections)

| Endpoint (collection) | « Méthode » | Rôle requis | Validation | Service | Modèle | Contrôle permission | Gestion erreur | Utilisé front | Problème | Reco |
|---|---|---|---|---|---|---|---|:---:|---|---|
| `users/{uid}` | read | owner/admin | — | `users.ts` | `AppUser` | ✅ rules | ⚠️ fallback trompeur | ✅ | BE-04 | logguer, pas de fallback actif |
| `users/{uid}` | create | owner | rôle ∈ liste | `users.ts` | `AppUser` | ✅ rules | ✅ | ✅ | — | ajouter `phone` si conservé |
| `users/{uid}` | update | owner(role/status figés)/admin | partielle | — | `AppUser` | ✅ rules | n/a | ❌ | pas d'UI d'édition profil | construire UI |
| `communities/{c}/posts` | create | signed-in | ❌ aucune | — | `CommunityPost` | ⚠️ pas d'`authorUid` check | n/a | ❌ | BE-01/BE-02, SEC impersonation | corriger rules + modèle |
| `forumThreads` | create | signed-in | ❌ aucune | — | `ForumThread` | ⚠️ idem | n/a | ❌ | BE-01/BE-02 | corriger rules + modèle |
| `conversations` | create | participant | partielle | — | `Conversation` | ⚠️ modèle sans `participants` | n/a | ❌ | BE-01 | aligner modèle |
| `medications`/`pathologies`/… | read | public | — | — (mock) | divers | ✅ | n/a | ❌ | front lit le mock | brancher Firestore |

---

**Score back-end : 42/100.** Les fondations Firebase sont correctes (deny-by-default, rôles, statut calculé, dégradation sans config), mais le back-end est **embryonnaire** : une seule collection réellement utilisée, modèles non alignés avec les règles, validation serveur quasi absente, pas de pagination/index, outillage admin/seed fragile et gestion d'erreurs muette.

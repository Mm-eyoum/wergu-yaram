# Branchement Firestore réel — runbook

Le code est **déjà câblé** sur Firestore : les pages lisent le contenu via
`src/hooks/useCatalog.ts` → `src/services/catalog.ts`, qui interroge Firestore et
**retombe automatiquement sur les données mock** tant qu'une collection est vide.
Il ne reste donc que des étapes **opérationnelles** (déploiement + seed), à exécuter
sous votre compte Google.

État du code/config (fait) :
- `firestore.rules` — règles complètes (profils, contenu admin-only, organizations/pages,
  communautés/posts, forum, sous-collections utilisateur, messagerie).
- `firestore.indexes.json` — index composites (organizations ×3, forumThreads, conversations).
- `firebase.json` / `.firebaserc` — projet `werguyaram`, Firestore + Storage + Hosting.
- Seed contenu : `npm run seed:admin` (Admin SDK, recommandé) ou `npm run seed` (client).
- Recherche : `src/services/search.ts` (Typesense + fallback mock), `npm run typesense:index`.

---

## Étapes (une seule fois)

### 0. Prérequis
```bash
# Connexion CLI (interactif — votre compte Google propriétaire du projet werguyaram)
npx firebase login
# Vérifier le projet actif
npx firebase use werguyaram
```
Dans la console Firebase : **Build → Firestore Database → Créer** (choisir une région,
par ex. `eur3`). **Build → Authentication** : activer **E-mail/Mot de passe** et **Google**.
**Build → Storage** : activer.

### 1. Déployer règles + index + storage
```bash
npm run deploy:rules        # firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 2. Clé de service (pour les scripts Admin SDK)
Les écritures de contenu et la promotion d'admin contournent les règles via l'Admin SDK,
qui exige une clé de service :
Console Firebase → **Paramètres du projet → Comptes de service → Générer une nouvelle clé privée**.
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/chemin/serviceAccountKey.json   # ne pas committer
```

### 3. Peupler le contenu (seed)
**Recommandé — Admin SDK** (fonctionne même avec les règles strictes déjà déployées) :
```bash
npm run seed:admin          # bypass des règles ; écrit medications, pathologies, articles,
                            # facilities, communities, equipmentNeeds, events, partners
```
Alternative sans clé de service : si la base est en *test mode* (règles ouvertes 30 j),
`npm run seed` (client) fonctionne ; sinon il renvoie `PERMISSION_DENIED` (rules admin-only).

### 4. Créer le premier administrateur
L'inscription publique crée toujours un `patient_public` (les règles interdisent
l'auto-promotion). Pour le premier admin :
1. Créez un compte via l'app (`/inscription`).
2. Promouvez-le avec l'Admin SDK :
   ```bash
   npm run set:admin -- votre@email.com super_admin
   ```
   (ou Console → **Firestore → `users/{uid}`** → `role` = `super_admin`).
3. Les admins suivants se promeuvent depuis la page **Administration** (`/admin`).

### 5. Indexer la recherche (Typesense)
Renseignez `TYPESENSE_*` (clé admin) et `VITE_TYPESENSE_*` (clé search-only) dans `.env.local`,
puis :
```bash
npm run typesense:index     # crée la collection "content" et indexe le catalogue
```
Sans Typesense configuré, la recherche **retombe automatiquement** sur l'index local — l'app
reste pleinement fonctionnelle.

### 6. Vérifier que l'app lit Firestore
```bash
npm run dev
```
- Ouvrir une fiche (ex. `/pathologies/hypertension-arterielle`).
- Modifier un document dans la console Firestore → la page reflète la valeur **live**
  (preuve que ce n'est plus le mock). Onglet Réseau : requêtes vers `firestore.googleapis.com`.

### 7. (Optionnel) Mettre le site en ligne
```bash
npm run deploy:hosting      # build SEO + firebase deploy --only hosting
```

---

## Notes
- **Sécurité** : la sécurité repose sur `firestore.rules` (et non sur l'`apiKey`, publique
  côté web). Restreindre la clé par domaine dans Google Cloud Console est recommandé.
- **Fallback mock** : si Firestore est injoignable ou une collection vide, l'app continue
  d'afficher le contenu bundlé — aucune page blanche.
- **Données utilisateur** (favoris, recherches sauvegardées, communautés, forum, messagerie,
  pages/organizations) sont déjà 100 % Firestore via les services dédiés ; pas de seed requis.
- **Re-seed** : `seed`/`seed:admin` sont idempotents (id = slug/id), ils écrasent les documents.
- **Sync recherche** : après une modification de contenu, relancez `npm run typesense:index`
  (ou laissez la Cloud Function `functions/src/index.ts` synchroniser Firestore → Typesense).

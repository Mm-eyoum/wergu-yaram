# Wergu Yaram

Portail santé (Sénégal) : catalogue de contenu vérifié (médicaments, pathologies,
articles), annuaire de structures de santé, communautés/forum, messagerie, et
collecte de dons pour des besoins en équipement.

**Stack :** React 18 + TypeScript + Vite · Firebase (Auth, Firestore, Storage,
Cloud Functions) · TanStack React Query · Tailwind CSS · Leaflet · Typesense
(recherche, optionnel).

Le client tape Firestore en direct ; la sécurité repose donc sur
[`firestore.rules`](firestore.rules) et [`storage.rules`](storage.rules). Les
opérations à secret (paiements Bictorys, import Google Places) sont isolées dans
[`functions/`](functions/src/index.ts).

## Prérequis

- Node.js 20+
- Un projet Firebase (Auth e-mail/Google, Firestore, Storage) — défaut : `werguyaram`
- Firebase CLI : `npm i -g firebase-tools` (ou `npx firebase-tools`)

## Démarrage local

```bash
npm install
cp .env.example .env.local      # puis renseigner les clés Firebase (web)
npm run dev                     # http://localhost:5173
```

Les variables d'environnement sont documentées dans [`.env.example`](.env.example).
Sans Firebase configuré, l'app fonctionne sur des **données mock** bundlées
(fallback automatique, voir [`src/services/catalog.ts`](src/services/catalog.ts)).

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de dev (Vite, HMR) |
| `npm run build` | Typecheck + build de prod (`dist/`) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run test:run` / `npm run test:coverage` | Tests unitaires (Vitest) |
| `npm run e2e` | Smoke tests Playwright |
| `npm run seed` | Seed du contenu Firestore depuis les données mock |
| `npm run set:admin` | Promotion d'un compte en `admin`/`super_admin` (Admin SDK) |
| `npm run typesense:index` | Indexation du contenu vers Typesense |
| `npm run deploy:rules` | Déploie règles Firestore/Storage + index |
| `npm run deploy:hosting` | Build SEO + déploie l'hébergement |

## Bootstrap d'un administrateur

Les règles Firestore interdisent à un client de s'attribuer un rôle élevé. Le
seul moyen est l'Admin SDK :

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/chemin/serviceAccountKey.json
SEED_ADMIN_EMAIL=admin@example.com npm run set:admin
# ou : npm run set:admin -- admin@example.com super_admin
```

Le compte cible doit déjà s'être inscrit dans l'application. Il n'y a **pas**
d'e-mail par défaut codé en dur ; un argument ou `SEED_ADMIN_EMAIL` est requis.

## Déploiement

```bash
npm run deploy:rules      # règles + index (à déployer avant/avec le code)
npm run deploy:hosting    # SPA
firebase deploy --only functions
```

> **Environnements** — un seul projet Firebase (`werguyaram`) est configuré
> dans [`.firebaserc`](.firebaserc). Pour séparer staging/prod, ajoutez des alias
> (`firebase use --add`) et déployez avec `--project <alias>`. Les origines CORS
> des Cloud Functions sont configurables via la variable `CORS_ORIGINS`
> (voir [`functions/src/index.ts`](functions/src/index.ts)).

## Tests des règles de sécurité

Les règles sont le cœur de la sécurité. Vérifiez-les avec l'émulateur :

```bash
firebase emulators:start --only firestore,storage
```

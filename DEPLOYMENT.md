# Déploiement — Wergu Yaram

Checklist de mise en production. Projet Firebase par défaut : `werguyaram` (`.firebaserc`).

> **Lancement actuel** : tout SAUF les dons en ligne (CTA neutralisé « Bientôt »,
> `VITE_BICTORYS_ENABLED=false`). Domaine principal : `https://werguyaram.org`
> (servi via Cloudflare → origine Firebase Hosting `werguyaram.web.app`).
> Branche de prod : `main` (= la plateforme React ;
> l'ancien site vitrine Astro est conservé sur la branche `website-astro`).

## 1. Pré-requis
- Node 20+, `npm ci`
- Firebase CLI : `npx -y firebase-tools@latest --version`
- Plan **Blaze** activé (requis pour les Cloud Functions)
- `.env.local` rempli avec les clés `VITE_FIREBASE_*` (jamais commité — voir `.env.example`)
- `VITE_APPCHECK_SITE_KEY` : clé reCAPTCHA v3 (console Firebase > App Check). Sans elle, App Check
  est désactivé côté client — l'app fonctionne mais sans la protection anti-abus.
- `VITE_SITE_URL=https://werguyaram.org` (origine canonique pour OG/sitemap)
- `VITE_PLACES_API_KEY` (import annuaire admin) ; secret serveur `PLACES_API_KEY` côté Functions
- Java 11+ **uniquement pour les tests de règles via l'émulateur** (l'app n'en a pas besoin)

## 2. Vérifications avant build
```bash
npm run lint        # 0 erreur
npm run typecheck   # 0 erreur
npm run test:run    # suite verte
npm run build       # build de prod propre
```

## 3. Déploiement des règles & index Firestore / Storage
```bash
npx firebase deploy --only firestore:rules,firestore:indexes,storage --project werguyaram
```
- `firestore.rules` — rôles (`patient_public`/`admin`/`super_admin`), pages `organizations`
  (création `pending`, validation admin-only), anti-impersonation posts/forum, messagerie par participants.
- `firestore.indexes.json` — index composites : organizations (type+status, status, ownerUid),
  forumThreads (kind+createdAt), conversations (participants array-contains + updatedAt).
- `storage.rules` — avatars `users/{uid}/avatar/*` et assets `organizations/{id}/*` (images ≤ 5 Mo).

## 4. Seed des données
```bash
# Contenu éditorial (médicaments, pathologies, articles, établissements, communautés, événements, partenaires…)
npx -y tsx scripts/seed.ts        # exécuter authentifié comme admin, ou via l'émulateur

# Premier compte élevé — OBLIGATOIRE pour accéder à /admin
npm i -D firebase-admin
export GOOGLE_APPLICATION_CREDENTIALS=/chemin/serviceAccountKey.json
npx -y tsx scripts/seedAdmin.ts   # promeut max.eyoum@eyone.net en super_admin
#   ⚠️ l'utilisateur doit d'abord s'être inscrit (un compte Auth + users/{uid} doivent exister)
#   puis se reconnecter pour rafraîchir son token.
```

## 4 bis. Déploiement des Cloud Functions
Les Functions servent l'import d'annuaire admin (`searchPlaces`/`importPlaces`) ; `createBictorysCharge`/
`bictorysWebhook` restent déployées mais dormantes tant que Bictorys n'est pas câblé.
```bash
# Secret requis pour l'import Places (les secrets Bictorys ne sont pas nécessaires au lancement) :
npx firebase functions:secrets:set PLACES_API_KEY --project werguyaram
npx firebase deploy --only functions --project werguyaram
```

## 5. Déploiement du front
```bash
npm run build
npx firebase deploy --only hosting --project werguyaram
# (ou `npm run build:seo` pour inclure OG images + sitemap + prerender)
```
> ⚠️ **Seed avant `build:seo`.** Le prérendu SEO (`scripts/prerender.mjs`) lit le catalogue via
> `src/services/catalog.ts`, qui retombe sur les **données mock** quand Firestore est vide. Lancer
> `build:seo` sur un Firestore non seedé fige du contenu mock dans le HTML prérendu et le sitemap.
> Toujours exécuter le seed (§4) **avant** un `build:seo` de production.

## 6. Tests de règles Firestore (CI, Java 11+)
Les tests de règles par rôle (un user ne valide pas sa propre page ; un non-super-admin ne peut pas
accorder `admin` ; un compte suspendu ne peut pas contribuer ; messages réservés aux participants ;
audit append-only ; deny par défaut) sont dans [`firestore.rules.test.ts`](firestore.rules.test.ts) et
tournent via l'émulateur :
```bash
npm run test:rules   # = firebase emulators:exec --only firestore "vitest run --config vitest.rules.config.ts"
```
> Non exécutable sur Java 8 — prévoir **Java 11+**. Le job CI `rules` (`.github/workflows/ci.yml`)
> installe Temurin 17 et exécute cette suite à chaque PR/push.

## 6 bis. Déploiement automatisé (optionnel)
Le workflow [`deploy.yml`](.github/workflows/deploy.yml) déploie règles+index+storage et/ou hosting,
en `workflow_dispatch` manuel ou sur tag `v*`, derrière l'environnement GitHub `production` (revue
obligatoire). Renseigner les secrets requis (voir l'en-tête du workflow : `FIREBASE_SERVICE_ACCOUNT`
+ les variables `VITE_*`). Sinon, le déploiement manuel des sections 3 et 5 reste valable.

## 7. Contrôles finaux
- [ ] Règles + index + storage déployés et testés
- [ ] Cloud Functions déployées (`searchPlaces`/`importPlaces` répondent)
- [ ] `super_admin` provisionné (max.eyoum@eyone.net) et `/admin` accessible
- [ ] Un parcours complet testé par rôle : inscription patient → création de page → validation admin → page publique
- [ ] Messagerie : envoi réel persisté (conversation support)
- [ ] **App Check** : enforcement activé en console (Firestore/Storage/Functions) une fois le client déployé et validé
- [ ] CTA de don bien neutralisé (« Bientôt ») — aucun appel paiement
- [ ] Aucune clé secrète exposée côté client ; mode debug désactivé (`VITE_APPCHECK_DEBUG_TOKEN` vide)
- [ ] Dépendances : `npm audit --omit=dev` = **0 vulnérabilité** côté client. Résidus connus = outillage dev
      (vite/vitest, non déployé) + transitives serveur `firebase-admin` (non corrigeables sans bump majeur cassant).

## En attente (hors périmètre actuel)
- **Dons / paiement** : l'intégration Bictorys (Cloud Functions `createBictorysCharge` + `bictorysWebhook`)
  est en place côté code, et la couche données est **durcie** : règles `donations` (écriture serveur
  uniquement ; lecture par le donateur propriétaire ou un admin), index `donations(donorUid, createdAt)`,
  borne de montant (500 – 5 000 000 XOF) et rate-limit par donateur (20 charges/h) sur la création.
  **Reste à fournir** : le compte marchand + les secrets (`BICTORYS_API_KEY`, `BICTORYS_WEBHOOK_SECRET`)
  et la confirmation des noms de champs/événements de l'API Bictorys. D'ici là, le CTA de don reste
  honnête (pas de fausse promesse « 100 % reversé »).

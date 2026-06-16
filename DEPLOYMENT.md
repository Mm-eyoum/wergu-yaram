# Déploiement — Wergu Yaram

Checklist de mise en production. Projet Firebase par défaut : `werguyaram` (`.firebaserc`).

## 1. Pré-requis
- Node 20+, `npm ci`
- Firebase CLI : `npx -y firebase-tools@latest --version`
- `.env.local` rempli avec les clés `VITE_FIREBASE_*` (jamais commité — voir `.env.example`)
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

## 5. Déploiement du front
```bash
npm run build
npx firebase deploy --only hosting --project werguyaram
# (ou `npm run build:seo` pour inclure OG images + sitemap + prerender)
```

## 6. Tests de règles Firestore (CI, Java 11+)
Les tests de règles par rôle (un user ne valide pas sa propre page ; un non-super-admin ne peut pas
accorder `admin` ; un compte suspendu ne peut pas contribuer) tournent via l'émulateur :
```bash
npm i -D @firebase/rules-unit-testing
npx firebase emulators:exec --only firestore "vitest run firestore.rules.test"
```
> Non exécutable sur Java 8 — prévoir Java 11+ dans le pipeline CI.

## 7. Contrôles finaux
- [ ] Règles + index + storage déployés et testés
- [ ] `super_admin` provisionné (max.eyoum@eyone.net) et `/admin` accessible
- [ ] Un parcours complet testé par rôle : inscription patient → création de page → validation admin → page publique
- [ ] Messagerie : envoi réel persisté (conversation support)
- [ ] Aucune clé secrète exposée côté client ; mode debug désactivé
- [ ] Dépendances : `npm audit` (mettre à jour Firebase pour résorber les vulnérabilités transitoires)

## En attente (hors périmètre actuel)
- **Dons / paiement** : intégration d'un agrégateur (Wave + Orange Money + carte, ex. CinetPay/PayDunya)
  nécessite un compte marchand + une Cloud Function (checkout + webhook de confirmation) + une collection
  `donations`. À brancher une fois le compte agrégateur fourni — d'ici là, le CTA de don reste honnête
  (pas de fausse promesse « 100 % reversé »).

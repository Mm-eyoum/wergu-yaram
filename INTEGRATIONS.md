# Intégrations externes — Wergu Yaram

Trois intégrations sont câblées avec **env-gating + dégradation propre** : tant
que les variables ne sont pas renseignées, l'application fonctionne (fallback) et
le build reste vert. Aucun secret n'est committé.

| Intégration | Rôle | Activée par | Sans config |
|-------------|------|-------------|-------------|
| **Typesense Cloud** | Recherche | `VITE_TYPESENSE_*` | Recherche locale (index mock) |
| **Chatwoot Cloud** | Support (agent↔user) | `VITE_CHATWOOT_*` | CTA support → `/messages` |
| **Bictorys** | Paiement des dons | `VITE_BICTORYS_ENABLED` + Functions | Bouton « bientôt disponible » |

---

## 1. Typesense Cloud (recherche)

**Code** : [src/services/search.ts](src/services/search.ts) (client search-only + Nearest Node + fallback),
[src/hooks/useSearch.ts](src/hooks/useSearch.ts), [src/pages/SearchResults.tsx](src/pages/SearchResults.tsx),
script d'indexation [scripts/typesense-index.ts](scripts/typesense-index.ts).

**Mise en place (Typesense Cloud — https://cloud.typesense.org)**
1. Créer un cluster. Le dashboard fournit : le(s) **hostname(s) de nœud**
   (`xxxxx-1.a1.typesense.net`), un **Nearest Node** (`xxxxx.a1.typesense.net`),
   le port `443`/`https`, et l'**Admin API key**.
2. Générer une clé **Search-Only** : dashboard → *API Keys* → *Generate Search Only Key*
   (ou via l'API, `actions:["documents:search"]`, `collections:["content"]`).
3. Renseigner `.env.local` :
   - Client : `VITE_TYPESENSE_HOST` (un nœud), `VITE_TYPESENSE_NEAREST_HOST` (Nearest Node, optionnel mais recommandé), `VITE_TYPESENSE_SEARCH_KEY`, `VITE_TYPESENSE_COLLECTION=content`.
   - Indexation (serveur) : `TYPESENSE_HOST` (un nœud, **pas** le Nearest Node), `TYPESENSE_ADMIN_KEY`.
4. Indexer : `npm run typesense:index` (recrée la collection `content` et importe l'index).
5. Vérifier : `/recherche` passe par Typesense ; retirer la clé → fallback mock automatique.

> ⚠️ La clé **admin** ne doit JAMAIS être en `VITE_*` (exposée au navigateur) :
> uniquement côté serveur/CI pour l'indexation.
> À terme, faire pointer le script d'indexation vers Firestore plutôt que `SEARCH_INDEX`.

---

## 2. Chatwoot Cloud (support)

**Code** : [src/services/chatwoot.ts](src/services/chatwoot.ts) (loader SDK),
[src/hooks/useSupport.ts](src/hooks/useSupport.ts), CTA « Contacter le support » dans
[src/pages/Dashboard.tsx](src/pages/Dashboard.tsx).

**Positionnement** : Chatwoot est du **support agent↔utilisateur**, pas de la
messagerie pair-à-pair. Il sert donc le cas « parler à l'équipe ». La messagerie
patient↔structure reste prévue sur Firestore (`conversations/*`, règles déjà en place).

**Mise en place (Chatwoot Cloud — https://app.chatwoot.com)**
1. Créer un compte sur **app.chatwoot.com**.
2. *Inboxes* → *Add Inbox* → **Website** → récupérer le **Website Token**
   (le script d'installation affiche `websiteToken` et `baseUrl: https://app.chatwoot.com`).
3. Renseigner `.env.local` :
   - `VITE_CHATWOOT_BASE_URL=https://app.chatwoot.com`
   - `VITE_CHATWOOT_WEBSITE_TOKEN=<le token>`
4. Le widget se charge **à la demande** (clic sur « Contacter le support ») ;
   l'utilisateur connecté est identifié via `setUser(uid, {name, email})`.

**Identité vérifiée (recommandé, optionnel)** : dans les *Inbox Settings* →
*Configuration*, activer l'**HMAC** et copier le **HMAC token**. Générer ensuite
`identifier_hash = HMAC_SHA256(hmac_token, uid)` **côté serveur** (Function) et le
passer à `setUser`. Le secret HMAC ne doit jamais être exposé côté client.

---

## 3. Bictorys (paiement des dons)

**Code** : Functions [functions/src/index.ts](functions/src/index.ts)
(`createBictorysCharge` + `bictorysWebhook`), client
[src/services/payments.ts](src/services/payments.ts), UI
[src/components/equipment/DonationWidget.tsx](src/components/equipment/DonationWidget.tsx),
config [firebase.json](firebase.json).

**Flux** : le client appelle la Function `createBictorysCharge` → la Function
(clé secrète, montant figé) crée la charge `POST /pay/v1/charges` → renvoie l'URL
de **checkout hébergé** → le client y redirige. Bictorys notifie ensuite
`bictorysWebhook`, qui crédite `equipmentNeeds.raisedAmount`/`donorsCount` de
façon idempotente. Un document `donations/{id}` trace chaque paiement.

**Mise en place**
1. `cd functions && npm install`.
2. Secrets (Secret Manager) :
   - `firebase functions:secrets:set BICTORYS_API_KEY`
   - `firebase functions:secrets:set BICTORYS_WEBHOOK_SECRET`
3. Params non secrets (`functions/.env`) : `BICTORYS_API_URL`, `APP_PUBLIC_URL`.
4. Déployer : `firebase deploy --only functions`.
5. Configurer l'URL du webhook (`…/bictorysWebhook`) dans le dashboard Bictorys.
6. Côté app : `VITE_BICTORYS_ENABLED=true` puis rebuild/redeploy hosting.

> ⚠️ **À confirmer dans la doc Bictorys** (https://docs.bictorys.com) avant prod :
> le nom exact du champ d'URL de checkout dans la réponse, le schéma de signature
> du webhook (en-tête + algorithme) et les valeurs de `status`. Les accès sont
> codés de façon **défensive** (plusieurs variantes) et commentés dans le code.
> Pour les paiements **carte en Direct API**, une certification **PCI-DSS** est
> requise ; le checkout hébergé l'évite.

---

## Sécurité — règle d'or

- Clés **publiques/search-only/website token** : OK en `VITE_*` (exposées au navigateur).
- Clés **secrètes** (Bictorys API key, webhook secret, Typesense admin, HMAC Chatwoot) :
  **uniquement** côté serveur (Secret Manager / `functions/.env` non committé / scripts serveur).
- `.env.local` et `functions/.env` sont git-ignorés.

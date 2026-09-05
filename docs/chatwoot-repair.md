# `chat.werguyaram.org` — diagnostic corrigé (2026-09-05)

> **Ce document remplace une version antérieure dont le diagnostic était faux.**
> Elle affirmait que Chatwoot était auto-hébergé et que le sous-domaine avait
> perdu son enregistrement DNS lors du passage à Cloudflare. Suivre cette
> procédure aurait créé un enregistrement `chat` pointant vers le vide.

## Ce qui se passe réellement

`https://chat.werguyaram.org` renvoie 404 — mais **rien n'a jamais été servi à
cette adresse**. Trois éléments le prouvent :

1. **La configuration déployée pointe ailleurs.** `functions/.env.werguyaram`
   contient `CHATWOOT_BASE_URL=https://app.chatwoot.com` : le support tourne sur
   **Chatwoot Cloud** (compte `171761`), pas sur une instance auto-hébergée.
2. **Aucun certificat n'a jamais été émis** pour `chat.werguyaram.org` dans les
   journaux de transparence (`crt.sh`). Les seuls sous-domaines certifiés sont
   `demo`, `senhealth`, `www` et les hôtes mail IONOS. Un serveur Chatwoot
   auto-hébergé aurait nécessairement laissé une trace Let's Encrypt.
3. **Le compte Cloudflare ne contient aucun tunnel** ni aucune ressource pouvant
   servir ce sous-domaine.

Le 404 vient du Worker `werguyaram-wildcard`, qui traite `chat` comme un
sous-domaine **réservé** (`infra/cloudflare/wildcard-worker.js`) — un garde-fou
posé en prévision d'un auto-hébergement qui n'a jamais eu lieu.

## Le vrai problème : le widget est désactivé en production

`src/services/chatwoot.ts` :

```ts
export const isChatwootConfigured = Boolean(baseUrl && websiteToken);
```

Le bundle servi par `werguyaram.org` ne contient **aucune** URL Chatwoot : ni
`VITE_CHATWOOT_BASE_URL` ni `VITE_CHATWOOT_WEBSITE_TOKEN` n'étaient définis au
build. La bulle de support ne s'affiche donc pas, et ce **indépendamment** du DNS.

## Correctif

### 1. CSP — fait

`firebase.json` autorisait `chat.werguyaram.org`, qui ne sert rien. Remplacé par
`app.chatwoot.com` dans `script-src`, `style-src`, `font-src`, `connect-src`
et `frame-src`. Sans cela, activer le widget l'aurait fait bloquer par la CSP.

*(Corrigé au passage : `https://overpass-api.de` manquait dans `connect-src`
alors que c'est la source **par défaut** de l'import d'annuaire — un bug actif.)*

### 2. Activer le widget — nécessite une valeur du tableau de bord Chatwoot

Dans **Chatwoot Cloud → Settings → Inboxes → (inbox Website) → Configuration**,
relever le **website token**, puis l'ajouter aux secrets de déploiement GitHub :

```
VITE_CHATWOOT_BASE_URL      = https://app.chatwoot.com
VITE_CHATWOOT_WEBSITE_TOKEN = <website token de l'inbox>
```

Puis redéployer l'hébergement (`npm run deploy:hosting`).

### 3. ⚠️ Incohérence à vérifier côté serveur

`functions/.env.werguyaram` contient :

```
CHATWOOT_ACCOUNT_ID        = 171761
CHATWOOT_WEBSITE_INBOX_ID  = 171761
```

Ces deux identifiants sont **identiques**, ce qui est très improbable : dans
Chatwoot, l'id de compte et l'id d'inbox appartiennent à des espaces de
numérotation distincts. `pushToChatwoot()` utilise `CHATWOOT_WEBSITE_INBOX_ID`
pour créer les conversations ; s'il est faux, les inscriptions newsletter et les
intentions de soutien échouent silencieusement (la fonction journalise et
renvoie `false` sans lever). À vérifier dans le tableau de bord.

### 4. Le sous-domaine `chat`

Il n'a plus de raison d'être. Deux options :

- **Le retirer** de `RESERVED_SUBS` (`src/lib/tenantHost.ts`) et de la liste
  `RESERVED` du Worker — il redeviendrait alors un slug de tenant possible.
- **Le conserver réservé** et, si l'on tient à l'adresse, le faire rediriger
  (301) vers `https://app.chatwoot.com` — pratique pour les agents qui l'ont mise
  en favori. À intégrer au Worker qui servira le site au Lot 1, plutôt que de
  modifier le proxy wildcard actuel pour si peu.

**Décision par défaut retenue : conserver la réservation**, et traiter la
redirection au Lot 1 avec le reste de la bascule d'hébergement.

## Webhook — non concerné

L'URL du webhook Chatwoot → application reste
`https://werguyaram.org/api/chatwootWebhook?token=<CHATWOOT_WEBHOOK_TOKEN>` :
elle est servie par l'hébergement principal et n'a jamais dépendu de `chat`.

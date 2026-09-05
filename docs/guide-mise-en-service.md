# Guide complet (débutant) — rendre Chatwoot + emails opérationnels

Ce guide vous fait passer de « rien n'est branché » à « tout fonctionne », étape
par étape, sans rien supposer connu. Suivez les parties **dans l'ordre**. Chaque
partie est indépendante : à la fin de la Partie 4, le chat web marche déjà ; vous
ajoutez ensuite WhatsApp, l'email, etc. quand vous voulez.

**Légende :** 🖥️ = à taper dans le Terminal · 🌐 = à faire dans un navigateur ·
📝 = à écrire dans un fichier.

---

## Vue d'ensemble (en français simple)

Vous installez **Chatwoot**, une « boîte de réception » unique pour votre équipe.
Tous les messages des visiteurs y arrivent, peu importe d'où ils viennent :
- le **chat** du site (la bulle en bas à droite),
- **WhatsApp**,
- les **emails** envoyés à `support@werguyaram.org`,
- (plus tard) Facebook/Instagram.

En plus, **Brevo** envoie automatiquement des emails (reçu de don, bienvenue
newsletter, rappels) au nom du site.

Le code est déjà écrit. Votre travail = **créer les comptes, copier des clés, et
les coller au bon endroit**. C'est tout.

---

## Ce dont vous avez besoin avant de commencer

1. Un ordinateur avec le **Terminal** ouvert dans le dossier du projet
   (`Wergu Yaram`).
2. **Node.js** installé (vérifiez : 🖥️ `node -v` doit afficher un numéro).
3. La **CLI Firebase**. Vérifiez : 🖥️ `npx firebase-tools@latest --version`.
   Connectez-vous une fois : 🖥️ `npx firebase-tools@latest login`.
4. Une **carte bancaire** : l'hébergement de Chatwoot coûte ~5–15 €/mois.
   WhatsApp et Brevo ont des paliers gratuits généreux.
5. Un peu de patience pour la **Partie 2** (héberger Chatwoot) — c'est la seule
   étape un peu technique. Le reste est du copier-coller.

> 💡 Conseil : faites les Parties 1 à 5 **en une fois** (le chat web marchera).
> Gardez WhatsApp (Partie 6) et l'email entrant (Partie 7) pour un autre jour.

---

## Partie 1 — Créer les comptes (15 min)

Ouvrez ces sites et créez un compte sur chacun. Notez vos identifiants.

1. 🌐 **Railway** — https://railway.app (héberge Chatwoot). Connexion avec GitHub.
2. 🌐 **Brevo** — https://www.brevo.com (emails). Plan gratuit : 300 emails/jour.
3. 🌐 **Meta for Developers** — https://developers.facebook.com (pour WhatsApp,
   plus tard). Vous y reviendrez en Partie 6.

C'est tout pour l'instant.

---

## Partie 2 — Héberger Chatwoot sur Railway (30–45 min)

C'est l'étape la plus longue, mais une seule fois. Railway propose un modèle
« tout prêt » qui installe Chatwoot **et** ses deux bases de données.

1. 🌐 Sur Railway, cliquez **New Project** → **Deploy a template**.
2. 🌐 Dans la recherche, tapez **Chatwoot**. Choisissez le template officiel
   Chatwoot. Railway crée automatiquement : l'app **Chatwoot**, une base
   **PostgreSQL** et un **Redis**. Cliquez **Deploy**.
3. ⏳ Attendez que tout passe au vert (5–10 min la première fois).
4. 🌐 Cliquez sur le service **Chatwoot** → onglet **Variables**. Vérifiez /
   ajoutez ces variables (Railway en remplit déjà beaucoup) :
   - `FRONTEND_URL` → on la renseigne à l'étape 6, laissez pour l'instant.
   - `SECRET_KEY_BASE` → doit être une longue chaîne. Si vide, générez-en une :
     🖥️ `openssl rand -hex 64` puis collez le résultat comme valeur.
   - `RAILS_ENV` = `production`.
5. 🌐 Onglet **Settings** du service Chatwoot → section **Networking** →
   **Generate Domain**. Railway vous donne une URL du type
   `chatwoot-production-xxxx.up.railway.app`. **Copiez-la.**

   > Vous pourrez plus tard la remplacer par `chat.werguyaram.org` (voir l'encadré
   > « Domaine personnalisé » en bas). Pour démarrer, l'URL Railway suffit.
6. 🌐 Retournez dans **Variables** → mettez
   `FRONTEND_URL = https://chatwoot-production-xxxx.up.railway.app`
   (l'URL exacte de l'étape 5, avec `https://`). Railway redéploie tout seul.
7. 🌐 Ouvrez l'URL dans le navigateur. Vous arrivez sur l'écran de création du
   **compte administrateur** de Chatwoot. Créez-le (nom, email, mot de passe).
   **Notez ces identifiants** : c'est votre accès agent.

✅ Chatwoot est en ligne. Gardez son URL sous la main, on l'appellera **VOTRE_URL_CHATWOOT**.

> ⚠️ Important : si **VOTRE_URL_CHATWOOT** n'est PAS `https://chat.werguyaram.org`,
> il faudra ajuster un fichier de sécurité (voir Partie 5, étape 4).

---

## Partie 3 — Préparer le widget de chat dans Chatwoot (10 min)

1. 🌐 Dans Chatwoot : menu de gauche → **Inboxes** (boîtes de réception) →
   **Add Inbox** (Ajouter).
2. 🌐 Choisissez **Website**. Donnez un nom (ex. « Site Wergu Yaram »), et comme
   domaine mettez `werguyaram.org`. Validez.
3. 🌐 Chatwoot affiche un **code d'installation**. Vous n'avez PAS besoin de copier
   le code (l'app le fait déjà), mais repérez la valeur **`websiteToken`** dedans
   (une longue suite de lettres/chiffres). **Copiez-la** → on l'appellera **TOKEN_SITE**.
4. 🌐 Allez dans les **réglages de cette inbox** → onglet **Configuration** →
   activez **Enable HMAC** (identité vérifiée). Une valeur **HMAC token** apparaît.
   **Copiez-la** → on l'appellera **CLE_HMAC**.

✅ Vous avez maintenant **TOKEN_SITE** et **CLE_HMAC**.

---

## Partie 4 — Récupérer les identifiants pour l'automatisation (5 min)

Encore deux infos à copier depuis Chatwoot :

1. 🌐 Regardez l'**URL** quand vous êtes connecté à Chatwoot. Elle ressemble à
   `.../app/accounts/2/...`. Le chiffre après `accounts/` (ici `2`) est votre
   **ID DE COMPTE** → **ID_COMPTE**.
2. 🌐 Toujours dans Inboxes → cliquez sur votre inbox **Website**. L'URL ressemble
   à `.../inboxes/5`. Le chiffre (`5`) est l'**ID DE L'INBOX** → **ID_INBOX**.
3. 🌐 En haut à droite, votre **profil** → **Profile Settings** → tout en bas,
   **Access Token** : copiez-le → **JETON_API**.
4. Inventez vous-même un mot de passe secret pour le webhook (n'importe quelle
   suite, ex. 20 caractères). Notez-le → **JETON_WEBHOOK**.

✅ Récapitulatif de ce que vous avez collecté :

| Nom dans ce guide | À quoi ça sert |
|---|---|
| **VOTRE_URL_CHATWOOT** | adresse de votre Chatwoot |
| **TOKEN_SITE** | affiche la bulle de chat |
| **CLE_HMAC** | sécurise l'identité de l'utilisateur |
| **ID_COMPTE**, **ID_INBOX** | ciblent la bonne boîte |
| **JETON_API** | laisse l'app créer des contacts |
| **JETON_WEBHOOK** | protège les notifications |

---

## Partie 5 — Brancher l'application (20 min)

Maintenant on colle ces valeurs dans le projet et on déploie. Tout se fait au
Terminal, **dans le dossier du projet**.

### 5.1 — Variables publiques du site (fichier `.env.local`)

📝 Ouvrez (ou créez) le fichier `.env.local` à la racine du projet et ajoutez /
modifiez ces deux lignes (remplacez par VOS valeurs) :

```
VITE_CHATWOOT_BASE_URL=https://VOTRE_URL_CHATWOOT
VITE_CHATWOOT_WEBSITE_TOKEN=TOKEN_SITE
```

### 5.2 — Paramètres serveur (fichier `functions/.env`)

📝 Ouvrez (ou créez) le fichier `functions/.env` et ajoutez :

```
CHATWOOT_BASE_URL=https://VOTRE_URL_CHATWOOT
CHATWOOT_ACCOUNT_ID=ID_COMPTE
CHATWOOT_WEBSITE_INBOX_ID=ID_INBOX
BREVO_SENDER=Wergu Yaram <no-reply@werguyaram.org>
```

### 5.3 — Secrets (jamais dans un fichier — on les met dans le coffre-fort Firebase)

🖥️ Tapez ces commandes **une par une**. À chaque fois, on vous demande la valeur :
collez-la et faites Entrée.

```
npx firebase-tools@latest functions:secrets:set CHATWOOT_HMAC_TOKEN
npx firebase-tools@latest functions:secrets:set CHATWOOT_API_TOKEN
npx firebase-tools@latest functions:secrets:set CHATWOOT_WEBHOOK_TOKEN
```

- `CHATWOOT_HMAC_TOKEN` → collez **CLE_HMAC**
- `CHATWOOT_API_TOKEN` → collez **JETON_API**
- `CHATWOOT_WEBHOOK_TOKEN` → collez **JETON_WEBHOOK**

(On ajoutera `BREVO_API_KEY` en Partie 8.)

### 5.4 — Ajuster la sécurité SI votre URL n'est pas chat.werguyaram.org

Le fichier `firebase.json` autorise par défaut le domaine `chat.werguyaram.org`.
Si **VOTRE_URL_CHATWOOT** est différente (ex. l'URL Railway), il faut l'autoriser :

📝 Ouvrez `firebase.json`, trouvez la longue ligne `Content-Security-Policy`, et
remplacez **toutes** les occurrences de `chat.werguyaram.org` par votre domaine
(sans `https://`). Il y en a dans `script-src`, `style-src`, `font-src`,
`connect-src` (deux fois : `https://…` et `wss://…`) et `frame-src`.

> Le plus simple : utilisez « Rechercher/Remplacer » de votre éditeur sur
> `chat.werguyaram.org` → votre domaine.

### 5.5 — Déployer

🖥️ Déployez les fonctions serveur, puis le site :

```
npx firebase-tools@latest deploy --only functions
npm run build
npx firebase-tools@latest deploy --only hosting
```

⏳ Le premier déploiement de fonctions peut prendre quelques minutes.

### 5.6 — Tester le chat web ✅

🌐 Ouvrez `https://werguyaram.org` (ou votre site). Une **bulle de chat** doit
apparaître en bas à droite. Écrivez un message : il doit arriver dans Chatwoot
(onglet **Conversations**). Connectez-vous sur le site : dans Chatwoot, le contact
doit afficher votre **nom/email** et un cadenas « vérifié ».

🎉 **Le support par chat est opérationnel.** Le reste, ci-dessous, ajoute les
autres canaux.

---

## Partie 6 — Activer les notifications de réponse (10 min)

Pour qu'un utilisateur soit prévenu dans l'app quand un agent lui répond :

1. 🌐 Dans Chatwoot : **Settings** → **Integrations** → **Webhooks** → **Add new webhook**.
2. 🌐 **Webhook URL** :
   `https://werguyaram.org/api/chatwootWebhook?token=JETON_WEBHOOK`
   (remplacez **JETON_WEBHOOK** par votre valeur de la Partie 4).
3. 🌐 Cochez l'événement **Message created**. Enregistrez.

✅ Quand un agent répond, une notification est enregistrée pour l'utilisateur.
(L'affichage d'une « cloche » dans l'en-tête du site est une amélioration future ;
la donnée, elle, est déjà stockée.)

---

## Partie 7 — Email sortant avec Brevo (20 min)

Pour envoyer automatiquement reçus de don, email de bienvenue et rappels.

1. 🌐 Dans **Brevo** → **Senders, Domains & Dedicated IPs** → **Domains** →
   ajoutez `werguyaram.org` et suivez les instructions pour valider **SPF** et
   **DKIM** (Brevo vous donne des enregistrements à ajouter chez votre fournisseur
   de domaine — là où vous gérez les DNS de werguyaram.org). C'est ce qui évite
   que vos emails tombent en spam.
2. 🌐 Dans Brevo → **SMTP & API** → **API Keys** → **Generate a new API key**.
   Copiez-la → **CLE_BREVO**.
3. 🖥️ Mettez-la dans le coffre-fort :
   ```
   npx firebase-tools@latest functions:secrets:set BREVO_API_KEY
   ```
   (collez **CLE_BREVO**).
4. 📝 Vérifiez que `functions/.env` contient bien la ligne `BREVO_SENDER=...`
   (mise en Partie 5.2). L'adresse doit être sur le domaine validé à l'étape 1.
5. 🖥️ Redéployez les fonctions :
   ```
   npx firebase-tools@latest deploy --only functions
   ```

✅ Test : inscrivez une adresse à la newsletter sur le site → vous devez recevoir
l'email de bienvenue. (Sans `BREVO_API_KEY`, rien ne plante : les emails sont
simplement ignorés.)

---

## Partie 8 — WhatsApp (Meta Cloud API) (45–60 min)

C'est la partie la plus longue côté comptes externes. Il faut un **numéro de
téléphone dédié** à WhatsApp Business (pas votre WhatsApp perso).

1. 🌐 Sur **developers.facebook.com** → **My Apps** → **Create App** → type
   **Business** → ajoutez le produit **WhatsApp**.
2. 🌐 Dans la configuration WhatsApp, ajoutez/validez votre **numéro**. Meta vous
   fournit : un **Phone Number ID**, un **WhatsApp Business Account ID**, et un
   **token d'accès** (générez un **token permanent**).
3. 🌐 Dans **Chatwoot** : **Inboxes** → **Add Inbox** → **WhatsApp** →
   provider **WhatsApp Cloud**. Renseignez :
   - **Phone Number ID** et **Business Account ID** (de l'étape 2),
   - **API Key** = le token permanent,
   - **Verify Token** = inventez une chaîne secrète (notez-la).
4. 🌐 Chatwoot affiche alors une **Callback URL** + le **Verify Token**.
   Retournez sur Meta → configuration **Webhooks** de WhatsApp → collez ces deux
   valeurs. (Le webhook de Meta pointe vers **Chatwoot**, pas vers votre site.)
5. 🌐 Dans Meta, faites **approuver au moins un “message template”** (obligatoire
   pour écrire en premier à un client hors fenêtre de 24 h).
6. 🌐 Test : envoyez un WhatsApp à votre numéro → la conversation apparaît dans
   l'inbox WhatsApp de Chatwoot.

> 💡 Si Meta vous semble compliqué, vous pouvez d'abord rester en mode test avec
> le numéro de démonstration fourni par Meta, puis basculer sur votre vrai numéro.

---

## Partie 9 — Email entrant : support@werguyaram.org (15 min)

Pour que les emails envoyés à votre adresse de support arrivent dans Chatwoot.

1. 🌐 Dans Chatwoot : **Add Inbox** → **Email**. Chatwoot vous donne une
   **adresse de réception** (du type `...@…chatwoot…`).
2. 🌐 Chez votre fournisseur d'emails (là où est géré `werguyaram.org`), créez une
   **règle de redirection** : tout ce qui arrive sur `support@werguyaram.org` est
   **transféré** vers l'adresse fournie par Chatwoot.
3. 🌐 Test : envoyez un email à `support@werguyaram.org` → il apparaît dans
   l'inbox Email de Chatwoot.

---

## Checklist finale ✅

- [ ] Chatwoot accessible en ligne (Partie 2)
- [ ] La bulle de chat s'affiche sur le site et les messages arrivent (5.6)
- [ ] L'utilisateur connecté apparaît « vérifié » dans Chatwoot (5.6)
- [ ] Webhook configuré (Partie 6)
- [ ] Email de bienvenue reçu après inscription newsletter (Partie 7)
- [ ] WhatsApp reçoit/envoie (Partie 8)
- [ ] Email à support@ arrive dans Chatwoot (Partie 9)

---

## En cas de problème (dépannage)

- **La bulle de chat ne s'affiche pas** : ouvrez la console du navigateur (clic
  droit → Inspecter → onglet Console). Si vous voyez une erreur mentionnant
  « Content Security Policy » ou votre domaine Chatwoot, c'est l'étape **5.4** qui
  manque (autoriser votre domaine dans `firebase.json`), puis re-déployez le
  hosting. Vérifiez aussi que `.env.local` contient bien `VITE_CHATWOOT_BASE_URL`
  et `VITE_CHATWOOT_WEBSITE_TOKEN`, et que vous avez refait `npm run build` +
  `deploy --only hosting`.
- **« unauthenticated » à l'ouverture du chat** : normal si vous n'êtes pas
  connecté ; l'identité vérifiée ne s'applique qu'aux utilisateurs connectés.
- **Les emails ne partent pas** : vérifiez que `BREVO_API_KEY` est bien posé
  (🖥️ `npx firebase-tools@latest functions:secrets:access BREVO_API_KEY`) et que
  le domaine est validé (SPF/DKIM) dans Brevo. Regardez les logs :
  🖥️ `npx firebase-tools@latest functions:log`.
- **Une commande `secrets:set` se trompe** : relancez-la, elle écrase l'ancienne
  valeur. Pensez à re-déployer les fonctions après.
- **Voir les journaux du serveur** : 🖥️ `npx firebase-tools@latest functions:log`.

---

## (Optionnel) Domaine personnalisé chat.werguyaram.org

Pour une adresse propre au lieu de l'URL Railway :
1. 🌐 Railway → service Chatwoot → **Settings → Networking → Custom Domain** →
   ajoutez `chat.werguyaram.org`. Railway vous donne un enregistrement **CNAME**.
2. 🌐 Chez votre fournisseur DNS, créez ce CNAME pour `chat`.
3. 🌐 Dans Railway, mettez `FRONTEND_URL=https://chat.werguyaram.org`.
4. 📝 Dans `.env.local` et `functions/.env`, remplacez l'URL Railway par
   `https://chat.werguyaram.org`. Si vous aviez modifié `firebase.json` en 5.4,
   remettez-y `chat.werguyaram.org`.
5. 🖥️ Re-déployez : `deploy --only functions` puis `npm run build` +
   `deploy --only hosting`.

---

### Aide-mémoire des commandes

```
# Se connecter à Firebase (une fois)
npx firebase-tools@latest login

# Poser un secret (coffre-fort)
npx firebase-tools@latest functions:secrets:set NOM_DU_SECRET

# Déployer le serveur (fonctions)
npx firebase-tools@latest deploy --only functions

# Construire et déployer le site
npm run build
npx firebase-tools@latest deploy --only hosting

# Voir les logs serveur
npx firebase-tools@latest functions:log
```

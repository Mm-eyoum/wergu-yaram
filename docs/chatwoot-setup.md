# Chatwoot omnicanal — runbook de mise en service

Chatwoot est le **hub support unique** : web, WhatsApp, email entrant et réseaux
sociaux arrivent tous dans la même boîte agent. Ce dépôt code l'app cliente, les
Cloud Functions (identité vérifiée, webhook, push API, email Brevo) et la config.
La **connexion des canaux** se fait dans le tableau de bord Chatwoot + comptes
externes (Meta, DNS) : c'est l'objet de ce runbook.

> Décisions retenues : **auto-hébergé**, WhatsApp via **Meta Cloud API**, email
> **entrant (Chatwoot) + sortant (Brevo)**.

---

## A. Auto-héberger Chatwoot

1. **Déployer** (Docker) sur Railway / Fly.io / VPS — services **Postgres + Redis +
   Rails (web) + Sidekiq (worker)**. Image : `chatwoot/chatwoot:latest`.
   Variables clés :
   - `FRONTEND_URL=https://chat.werguyaram.org`
   - `SECRET_KEY_BASE=<openssl rand -hex 64>`
   - `RAILS_ENV=production`, `NODE_ENV=production`
   - SMTP sortant **de Chatwoot lui-même** (emails agents/notifs) : `SMTP_ADDRESS`,
     `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAILER_SENDER_EMAIL`.
     → on peut réutiliser **Brevo** en relais SMTP (`smtp-relay.brevo.com:587`).
2. **Domaine + TLS** : pointer `chat.werguyaram.org` vers l'instance (HTTPS obligatoire,
   sinon le widget est bloqué par la CSP).
   > Si vous choisissez un autre domaine, **mettez à jour la CSP** dans
   > [firebase.json](../firebase.json) (5 directives : script/style/font/connect/frame-src)
   > et `VITE_CHATWOOT_BASE_URL`.
3. **Compte & équipe** : créer le Super Admin, l'**Account**, les **Agents**, une **Team** support.
   Définir horaires d'ouverture et réponses pré-enregistrées (canned responses).

---

## B. Inbox Website (widget de l'app) + identité vérifiée

1. *Inboxes → Add Inbox → **Website*** → renseigner le domaine `werguyaram.org`.
   Récupérer le **Website Token**.
2. *Inbox Settings → Configuration* → activer **Enable HMAC** et copier le **HMAC token**.
3. Côté app (`.env.local`) :
   ```
   VITE_CHATWOOT_BASE_URL=https://chat.werguyaram.org
   VITE_CHATWOOT_WEBSITE_TOKEN=<website token>
   ```
4. Côté serveur (secret) : `firebase functions:secrets:set CHATWOOT_HMAC_TOKEN`
   (= le HMAC token). La Function `chatwootIdentity` calcule
   `identifier_hash = HMAC_SHA256(hmac_token, uid)` → le widget identifie l'utilisateur
   de façon **vérifiée**. Sans ce secret, session non vérifiée (dégradation propre).
5. Rebuild/redeploy hosting. La bulle flottante apparaît sur les pages publiques
   (montée par `SupportLauncher` dans `AppShell`).

---

## C. Push des formulaires publics → Chatwoot (API)

Quand un visiteur s'inscrit à la newsletter ou laisse une intention de don, les
triggers `onNewsletterSignup` / `onSupportIntent` créent un **contact + conversation**
dans l'inbox Website. Configuration serveur :

1. Profil agent/bot → **Access Token** → `firebase functions:secrets:set CHATWOOT_API_TOKEN`.
2. `functions/.env` (params non secrets) :
   ```
   CHATWOOT_BASE_URL=https://chat.werguyaram.org
   CHATWOOT_ACCOUNT_ID=<id du compte>           # visible dans l'URL du dashboard
   CHATWOOT_WEBSITE_INBOX_ID=<id de l'inbox Website>
   ```
3. `firebase deploy --only functions`.

---

## D. Webhook Chatwoot → notifications in-app

Pour notifier l'utilisateur quand un agent répond (hors widget ouvert) :

1. Choisir un jeton partagé : `firebase functions:secrets:set CHATWOOT_WEBHOOK_TOKEN`.
2. *Settings → Integrations → Webhooks → Add* :
   - URL : `https://werguyaram.org/api/chatwootWebhook?token=<le jeton>`
     (ou en-tête `X-Webhook-Token`).
   - Événements : **Message created** (au minimum).
3. La Function écrit `users/{uid}/notifications/cw_<id>` (idempotent) pour les
   messages **sortants** (agent → utilisateur).

---

## E. Canal Email entrant (support@)

1. *Add Inbox → **Email*** → Chatwoot fournit une **adresse de transfert**
   (`…@inbound.chatwoot…` ou domaine personnalisé).
2. Configurer `support@werguyaram.org` pour **forwarder** vers cette adresse
   (règle de redirection chez votre fournisseur mail), ou configurer IMAP/SMTP entrant.
3. Test : envoyer un email à `support@werguyaram.org` → il apparaît dans l'inbox Email.

> **Sortant** (reçus, newsletters) = **Brevo**, voir section G — distinct du canal entrant.

---

## F. Canal WhatsApp (Meta Cloud API)

Prérequis : **Meta Business Account** + un **numéro de téléphone** dédié (non déjà
utilisé sur l'app WhatsApp classique).

1. Sur **developers.facebook.com** : créer une app, ajouter le produit **WhatsApp**,
   récupérer `Phone Number ID`, `Business Account ID`, et un **Permanent Access Token**.
2. Dans Chatwoot : *Add Inbox → **WhatsApp** → Provider: WhatsApp Cloud* → renseigner
   `Phone Number ID`, `Business Account ID`, l'`API Key` (access token) et un
   **Verify Token** (chaîne au choix).
3. Chatwoot affiche une **Webhook URL** + le Verify Token → les coller dans la config
   Webhooks de l'app Meta (le webhook Meta pointe sur **Chatwoot**, pas sur nos Functions).
4. Faire **valider** au moins un *message template* côté Meta (pour les messages sortants
   hors fenêtre 24 h).
5. Test : envoyer un WhatsApp au numéro → la conversation arrive dans l'inbox WhatsApp.

> Réseaux sociaux (Messenger, Instagram, Telegram) : même logique *Add Inbox*, optionnels.

---

## G. Email sortant transactionnel (Brevo)

Reçus de dons, bienvenue newsletter, rappels d'abonnement sont envoyés par les Functions
via Brevo (`onNewsletterSignup`, `bictorysWebhook`, `remindDueSubscriptions`).

1. Compte **Brevo** → valider le domaine d'envoi (**SPF + DKIM** sur `werguyaram.org`).
2. `firebase functions:secrets:set BREVO_API_KEY` (clé API v3).
3. `functions/.env` : `BREVO_SENDER=Wergu Yaram <no-reply@werguyaram.org>`.
4. `firebase deploy --only functions`.

Sans `BREVO_API_KEY`, l'envoi est ignoré (log) sans rien casser.

---

## Récapitulatif des secrets / params

| Clé | Type | Où | Rôle |
|-----|------|----|------|
| `VITE_CHATWOOT_BASE_URL` / `VITE_CHATWOOT_WEBSITE_TOKEN` | public | `.env.local` | widget web |
| `CHATWOOT_HMAC_TOKEN` | secret | Secret Manager | identité vérifiée |
| `CHATWOOT_API_TOKEN` | secret | Secret Manager | push API (contacts) |
| `CHATWOOT_WEBHOOK_TOKEN` | secret | Secret Manager | protège `chatwootWebhook` |
| `CHATWOOT_BASE_URL` / `CHATWOOT_ACCOUNT_ID` / `CHATWOOT_WEBSITE_INBOX_ID` | param | `functions/.env` | endpoint API |
| `BREVO_API_KEY` | secret | Secret Manager | email sortant |
| `BREVO_SENDER` | param | `functions/.env` | expéditeur |

> Règle d'or : seuls les tokens **publics** (website token) vont en `VITE_*`. HMAC,
> API token, webhook token et Brevo restent **côté serveur** uniquement.

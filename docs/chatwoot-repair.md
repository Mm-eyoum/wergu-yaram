# Réparer `chat.werguyaram.org` (Chatwoot) après le passage à Cloudflare

## Cause

Depuis la migration du DNS de `werguyaram.org` vers **Cloudflare**, il n'y a plus
d'enregistrement **explicite** pour le sous-domaine `chat`. Il est donc capté par
le **wildcard `*.werguyaram.org`** (proxifié) et le **Worker** le détourne (404)
au lieu de l'envoyer au **serveur Chatwoot**. Résultat : Chatwoot est injoignable.

Diagnostic actuel : `dig chat.werguyaram.org` renvoie des IP Cloudflare
(`104.21.x` / `172.67.x`) et `https://chat.werguyaram.org` → **404**.

## Principe du correctif

Recréer un enregistrement DNS **explicite** `chat` → l'**origine réelle** du
serveur Chatwoot, en **DNS-only (nuage gris)**. Un enregistrement spécifique a la
**priorité sur le wildcard**, et le **gris** fait que ni le proxy ni le Worker
Cloudflare ne s'exécutent dessus → `chat` repart directement vers Chatwoot.

---

## Étape 1 — Retrouver l'origine du serveur Chatwoot

L'adresse vers laquelle `chat.werguyaram.org` pointait **avant** Cloudflare.
Selon ton hébergement Chatwoot :

- **VPS auto-hébergé** (DigitalOcean, Hetzner, OVH, Contabo…) → une **IP** (ex. `91.x.x.x`) → enregistrement **A**.
- **PaaS** (Railway, Render, Fly.io, Heroku…) → un **hostname** (ex. `xxx.up.railway.app`) → enregistrement **CNAME**.
- **Chatwoot Cloud** (app.chatwoot.com) → tu utiliserais leur domaine ; le custom domain se configure côté Chatwoot.

Où la trouver :
1. **Cloudflare → DNS** : un enregistrement `chat` a peut-être été importé lors du scan. S'il existe déjà :
   - s'il pointe vers la bonne origine → il suffit de le passer en **DNS-only (gris)** → **fin** (saute à l'étape 3).
   - s'il est en **proxifié (orange)** → clique l'icône nuage pour le passer en **gris**.
2. **Dashboard de ton hébergeur Chatwoot** → l'IP publique / le hostname du service.
3. **Historique DNS chez IONOS** (ancien gestionnaire) → la valeur de l'ancien enregistrement `chat`.
4. **Toi-même** : un éventuel fichier d'install / docker-compose / note de déploiement de Chatwoot.

## Étape 2 — Créer / corriger l'enregistrement dans Cloudflare

Cloudflare → **DNS → Add record** (ou éditer l'existant) :

| Champ | Valeur |
|---|---|
| Type | **A** (si IP) ou **CNAME** (si hostname) |
| Name | `chat` |
| Content/Target | l'**origine** trouvée à l'étape 1 |
| Proxy status | **DNS only (nuage GRIS)** — important |
| TTL | Auto |

## Étape 3 — SSL de l'origine

En DNS-only, le navigateur se connecte **directement** au serveur Chatwoot : ce
serveur doit présenter un **certificat valide pour `chat.werguyaram.org`**.
- Avant Cloudflare, ça marchait en direct → l'origine a déjà son **Let's Encrypt**
  (Chatwoot/Nginx). Le greyage le réutilise → rien à faire.
- Si le certificat avait expiré pendant la coupure, **renouvelle-le** sur le serveur
  (`certbot renew`, ou la procédure de ton install) une fois le DNS repointé.

## Étape 4 — Vérifier

Après propagation (quelques minutes) :
```bash
dig +short chat.werguyaram.org          # doit renvoyer l'IP/origine Chatwoot, PAS 104.21.x / 172.67.x
curl -sS -I https://chat.werguyaram.org  # doit répondre (page de login Chatwoot), cert valide
```

## Étape 5 — Reconnecter Chatwoot à la plateforme (si besoin)

Le DNS réparé, vérifie l'intégration côté app (cf. `docs/guide-mise-en-service.md`) :
- **Widget web** : `CHATWOOT_BASE_URL` (functions) / config client pointent sur `https://chat.werguyaram.org`.
- **Webhook Chatwoot → app** : dans Chatwoot, l'URL du webhook reste
  `https://werguyaram.org/api/chatwootWebhook?token=<CHATWOOT_WEBHOOK_TOKEN>`
  (servie par Firebase Hosting — indépendante de `chat`).
- **Identité vérifiée (HMAC)** : inchangée.

---

## Alternative (si tu veux garder `chat` derrière Cloudflare)

Possible mais plus complexe : laisser `chat` **proxifié (orange)** et **exclure**
le sous-domaine du Worker (ajouter une route Worker `chat.werguyaram.org/*` vide,
ou une règle d'exclusion), avec **SSL/TLS mode `Full`** et un cert valide à
l'origine. Le **DNS-only reste recommandé** : plus simple, et Chatwoot gère déjà
son propre HTTPS/WebSocket.

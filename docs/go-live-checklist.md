# Checklist de mise en service (go-live) — Wergu Yaram

La plateforme est **déployée** (hosting, règles Firestore, index, Cloud Functions). Ce document liste ce qui reste pour la rendre **pleinement opérationnelle**. Suivez les sections dans l'ordre ; chacune a un **test** concret.

> Légende : 🖥️ Terminal (dans le dossier du projet) · 🌐 Navigateur/dashboard · 📝 Fichier.
> Le code est écrit ; votre travail = **clés, DNS, et activation**.

---

## 1. Paiements — Bictorys (débloque dons, abonnements, billetterie)

Tant que ce n'est pas fait, l'UI affiche « paiement bientôt disponible ».

1. 🖥️ **Secrets** (coffre-fort, jamais dans un fichier) :
   ```
   npx firebase-tools@latest functions:secrets:set BICTORYS_API_KEY
   npx firebase-tools@latest functions:secrets:set BICTORYS_WEBHOOK_SECRET
   ```
   - `BICTORYS_API_KEY` = clé secrète marchande Bictorys.
   - `BICTORYS_WEBHOOK_SECRET` = secret de signature du webhook (doit être **identique** à celui configuré côté Bictorys, étape 4).
2. 📝 **Params non secrets** — `functions/.env` (déjà fournis dans `functions/.env.example`) :
   ```
   BICTORYS_API_URL=https://api.bictorys.com
   APP_PUBLIC_URL=https://werguyaram.org
   ```
3. 📝 **Activer côté site** — `.env.local` à la racine :
   ```
   VITE_BICTORYS_ENABLED=true
   ```
4. ✅ **Autoriser l'invocation du service Cloud Run** (binding IAM — **FAIT**, 2026-06-22). Sans lui, les routes `/api/*` renvoyaient **403**. Le bon membre est **`allUsers`** (invocation publique au niveau Cloud Run ; chaque fonction authentifie en interne : HMAC pour le webhook, token Firebase + rôle admin pour les Places). C'est exactement la config de `chatwootwebhook`.
   - ⚠️ `gcloud run …` exige **Python ≥ 3.10** ; sur Python 3.9 il plante (`unsupported operand type(s) for |`). Réparer via `brew install python@3.12` + `export CLOUDSDK_PYTHON="$(brew --prefix)/opt/python@3.12/bin/python3.12"`, **ou** passer par la Console.
   - **Console** (sans CLI) : Cloud Run → cocher le service → panneau **Autorisations** → **Ajouter un principal** `allUsers`, rôle **Cloud Run Invoker** → Enregistrer.
   - **CLI** (gcloud réparé) :
   ```
   for s in bictoryswebhook searchplaces importplaces; do
     gcloud run services add-iam-policy-binding "$s" \
       --region=us-central1 --project=werguyaram \
       --member=allUsers --role=roles/run.invoker
   done
   ```
   > Appliqué sur **`bictoryswebhook` + `searchplaces` + `importplaces`** ; vérifié `allUsers`/`roles/run.invoker` présent et routes joignables (401, plus 403).
5. 🌐 **Webhook côté Bictorys** : dans le dashboard Bictorys, pointez le webhook de paiement sur :
   ```
   https://werguyaram.org/api/bictorysWebhook
   ```
   (route stable ajoutée au Hosting ; utilisez `https://werguyaram.web.app/api/bictorysWebhook` tant que le domaine n'est pas rattaché — voir §2).
6. 🖥️ **Redéployer** : secrets → functions, flag → hosting :
   ```
   npx firebase-tools@latest deploy --only functions
   npm run build
   npx firebase-tools@latest deploy --only hosting
   ```
7. ✅ **Test** (d'abord en **sandbox** Bictorys) : `POST https://werguyaram.org/api/bictorysWebhook` sans signature doit répondre **401** (et non 403) → la route atteint la fonction. Puis un don de bout en bout → `equipmentNeeds.raisedAmount` crédité et une ligne dans **`/admin/revenue`**. Rejouer le webhook ne double pas (idempotent).

---

## 2. Domaine personnalisé `werguyaram.org` → Hosting

Le site est en ligne sur `werguyaram.web.app`. Pour `werguyaram.org` (utilisé par `APP_PUBLIC_URL` et les redirections de paiement) :

1. 🌐 Firebase Console → **Hosting** → **Add custom domain** → `werguyaram.org` (puis `www.werguyaram.org`).
2. 🌐 Ajoutez les enregistrements **A / TXT** indiqués chez votre registrar DNS.
3. ⏳ Attendez la propagation + l'émission du certificat **SSL** (jusqu'à 24 h).
4. ✅ **Test** : `https://werguyaram.org` s'ouvre en HTTPS ; après un don, la redirection `…/besoins/<id>?don=succes` retombe bien sur le site.

> Sans rattachement, les redirections de paiement (`APP_PUBLIC_URL=https://werguyaram.org`) pointent vers un domaine non servi. Option de repli : mettre temporairement `APP_PUBLIC_URL=https://werguyaram.web.app` dans `functions/.env` et redéployer les functions.

### 2b. Sous-domaines des espaces partenaires (multi-tenant, P2) — ⏳ à faire

Chaque espace partenaire est servi sur `<slug>.werguyaram.org` (résolu par `src/lib/tenantHost.ts`). Firebase Hosting ne gère pas un **wildcard** simplement — deux voies :

- **Par partenaire (MVP, recommandé au début)** : Firebase Console → **Hosting → Add custom domain** → ex. `assad.werguyaram.org` → ajouter l'enregistrement **A/CNAME** chez le registrar → SSL auto émis. À répéter à chaque nouveau partenaire.
- **Wildcard `*.werguyaram.org`** : nécessite un **Load Balancer GCP + certificat managé wildcard** devant Hosting/Cloud Run (plus lourd) — à envisager quand le nombre de partenaires le justifie.
- ✅ **En attendant**, l'espace est déjà accessible sans DNS : `https://werguyaram.web.app/espace/<slug>` (ou `?tenant=<slug>` sur le domaine principal).
- ✅ **Test** : `https://werguyaram.web.app/espace/assad` affiche la page brandée (après seed des `tenants`).

---

## 3. Données de production

1. 🖥️ **Seed du contenu** (médicaments, pathologies, articles, structures, communautés, besoins, événements, partenaires, plans tarifaires) :
   ```
   npm run seed
   ```
   Nécessite, dans `.env.local`, `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` d'un compte **admin** (ou base Firestore en « test mode » avant `deploy:rules`). Idempotent.
2. 🌐 **Vraies campagnes** : créez/éditez les besoins d'équipement réels via l'admin (`/admin/content`), avec montants, photos, impact.
3. 🌐 **Communautés ↔ intérêts** : sur chaque communauté (admin CMS), renseignez **Intérêts liés** (`relatedInterests`) / **Pathologies** (`pathologySlugs`) → active les **suggestions de communautés** au signup (Phase 1).
4. 🖥️ **Recherche (Typesense)** — optionnel mais recommandé : renseignez `VITE_TYPESENSE_*` (`.env.local`) + `TYPESENSE_ADMIN_KEY`, puis indexez :
   ```
   npm run typesense:index
   ```
   Sans Typesense, la recherche utilise l'index local embarqué (déjà fonctionnel).
5. ✅ **Test** : le contenu réel s'affiche (portail, carte, besoins) ; une recherche renvoie des résultats.

---

## 4. Support omnicanal — Chatwoot + Brevo

Déjà documenté pas à pas dans **[docs/guide-mise-en-service.md](guide-mise-en-service.md)** (Parties 2–9) :
- Héberger Chatwoot, inbox **Website** + **HMAC**, secrets `CHATWOOT_*`.
- **Webhook** Chatwoot → app : `https://werguyaram.org/api/chatwootWebhook?token=<CHATWOOT_WEBHOOK_TOKEN>`.
- **WhatsApp** (Meta Cloud API), **email entrant** (`support@`), **Brevo** sortant (SPF/DKIM + `BREVO_API_KEY`).

État connu : les secrets Chatwoot/Brevo et les params (`CHATWOOT_BASE_URL`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_WEBSITE_INBOX_ID`, `BREVO_SENDER`) ont été posés et les functions déployées. Reste à **finir les branchements de canaux** dans les dashboards (WhatsApp/email) et à coller le webhook.

### 4b. Templates WhatsApp pour les campagnes de prévention (P3) — ⏳ à faire

Les campagnes ciblées (`/admin/campaigns` → fonction `sendCampaign`, dispatch via Chatwoot) peuvent être envoyées à tout consentant. Mais **WhatsApp impose un *message template* approuvé par Meta** pour tout message sortant **hors de la fenêtre de 24 h** (les réponses entrantes et l'envoi sous 24 h n'en ont pas besoin).

1. 🌐 **Meta Business Manager → WhatsApp Manager → Message Templates → Create template**.
2. 🌐 Catégorie : **UTILITY** (rappels santé/RDV) ou **MARKETING** (sensibilisation) ; rédiger le contenu + variables ; **soumettre pour approbation** (24–48 h).
3. 🌐 Une fois approuvé, référencer le template côté **Chatwoot / WhatsApp Cloud API** pour l'envoi initial.
4. ✅ Le **consentement** (opt-in SMS/WhatsApp) est déjà capté côté plateforme (profil utilisateur) et filtré par `sendCampaign` ; rien à faire côté code.

> Sans template approuvé, l'envoi sortant initial WhatsApp échoue côté Meta — c'est une contrainte de la plateforme WhatsApp, pas de Wergu Yaram.

---

## 5. Checklist finale

- [x] **Binding IAM** `allUsers`/`run.invoker` sur `bictoryswebhook`/`searchplaces`/`importplaces` (routes joignables, 401 ≠ 403). *(fait 2026-06-22)*
- [ ] **Paiements** : don sandbox OK → crédité + visible dans `/admin/revenue` ; `VITE_BICTORYS_ENABLED=true` déployé.
- [ ] **Webhook Bictorys** configuré sur `/api/bictorysWebhook` (secret concordant).
- [ ] **Domaine** `werguyaram.org` rattaché, SSL actif, redirections de don OK.
- [ ] **Sous-domaines partenaires** (`<slug>.werguyaram.org`) rattachés au besoin (§2b) — sinon `/espace/<slug>`.
- [ ] **Templates WhatsApp** approuvés par Meta pour les campagnes hors fenêtre 24 h (§4b).
- [ ] **Seed** exécuté ; vraies campagnes saisies ; communautés taguées (intérêts/pathologies).
- [ ] **Recherche** : Typesense configuré et indexé (ou repli local accepté).
- [ ] **Chatwoot** : bulle de chat + utilisateur « vérifié » ; webhook de réponse posé.
- [ ] **Emails Brevo** : email de bienvenue reçu après inscription newsletter.
- [ ] **WhatsApp / email entrant** : conversations qui arrivent dans Chatwoot.

### Diagnostic
```
npx firebase-tools@latest functions:log          # journaux serveur
npx firebase-tools@latest functions:secrets:access NOM_DU_SECRET   # vérifier un secret
```

---

## Ce que seul vous pouvez faire
Clés/compte marchand **Bictorys** et configuration de son webhook ; **DNS** de `werguyaram.org` ; comptes & clés **Chatwoot / Meta (WhatsApp) / Brevo** ; validation **SPF/DKIM** ; identifiants **admin** pour le seed. Le reste (code, règles, functions, hosting) est déjà déployé et versionné.

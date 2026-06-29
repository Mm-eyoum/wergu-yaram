# Option B — Sous-domaines partenaires en wildcard `*.werguyaram.org`

Firebase Hosting ne gère pas les domaines wildcard. Cette procédure met en place un
**Load Balancer HTTPS externe (GCP) + certificat wildcard (Certificate Manager) +
backend Cloud Storage** servant le SPA. Aucun changement de code : le SPA résout déjà
le tenant via l'en-tête `Host` (`<slug>.werguyaram.org`, cf. `src/lib/tenantHost.ts`).

> Projet : `werguyaram`. `gcloud` requiert Python ≥ 3.10 (`export CLOUDSDK_PYTHON="$(brew --prefix)/opt/python@3.12/bin/python3.12"`).
> Variables réutilisées ci-dessous :
> ```bash
> export PROJECT=werguyaram
> export DOMAIN=werguyaram.org
> export BUCKET=werguyaram-spa      # nom global unique
> gcloud config set project "$PROJECT"
> ```

---

## A. Backend : bucket Cloud Storage servant le SPA
```bash
# 1. Bucket (accès uniforme)
gsutil mb -l US -b on "gs://$BUCKET"

# 2. Build SPA puis upload (depuis la racine du repo)
npm run build:seo
gsutil -m rsync -r -d dist "gs://$BUCKET"

# 3. Fallback SPA : index.html en page principale ET en page 404 (routing client)
gsutil web set -m index.html -e index.html "gs://$BUCKET"

# 4. Lecture publique des objets
gsutil iam ch allUsers:objectViewer "gs://$BUCKET"
```

## B. Certificat wildcard (Certificate Manager, via autorisation DNS)
```bash
# 1. Autorisation DNS pour le domaine parent (couvre le wildcard)
gcloud certificate-manager dns-authorizations create wy-dnsauth \
  --domain="$DOMAIN"

# 2. Récupère le CNAME _acme-challenge à créer chez ton registrar
gcloud certificate-manager dns-authorizations describe wy-dnsauth \
  --format="value(dnsResourceRecord.name, dnsResourceRecord.data)"
#   → ajoute ce CNAME au DNS, puis attends la validation

# 3. Certificat managé couvrant apex + wildcard
gcloud certificate-manager certificates create wy-wildcard \
  --domains="$DOMAIN,*.$DOMAIN" \
  --dns-authorizations=wy-dnsauth

# 4. Carte de certificats + entrées (hostname → cert)
gcloud certificate-manager maps create wy-certmap
gcloud certificate-manager maps entries create wy-cert-wild \
  --map=wy-certmap --certificates=wy-wildcard --hostname="*.$DOMAIN"
gcloud certificate-manager maps entries create wy-cert-apex \
  --map=wy-certmap --certificates=wy-wildcard --hostname="$DOMAIN"

# Suivi de l'émission (PROVISIONING → ACTIVE)
gcloud certificate-manager certificates describe wy-wildcard --format="value(managed.state)"
```

## C. Load Balancer HTTPS externe → backend bucket
```bash
# 1. IP statique globale
gcloud compute addresses create wy-lb-ip --global

# 2. Backend bucket (+ Cloud CDN)
gcloud compute backend-buckets create wy-backend \
  --gcs-bucket-name="$BUCKET" --enable-cdn

# 3. URL map
gcloud compute url-maps create wy-urlmap --default-backend-bucket=wy-backend

# 4. Proxy HTTPS cible (attaché à la carte de certificats)
gcloud compute target-https-proxies create wy-https-proxy \
  --url-map=wy-urlmap --certificate-map=wy-certmap

# 5. Règle de transfert 443
gcloud compute forwarding-rules create wy-fr-https \
  --global --target-https-proxy=wy-https-proxy \
  --ports=443 --address=wy-lb-ip

# (optionnel) Redirection HTTP→HTTPS
gcloud compute url-maps import wy-redirect --global --source=/dev/stdin <<'EOF'
name: wy-redirect
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
EOF
gcloud compute target-http-proxies create wy-http-proxy --url-map=wy-redirect
gcloud compute forwarding-rules create wy-fr-http \
  --global --target-http-proxy=wy-http-proxy --ports=80 --address=wy-lb-ip
```

## D. DNS chez le registrar
```bash
gcloud compute addresses describe wy-lb-ip --global --format="value(address)"
```
- Ajoute un enregistrement **A wildcard** : `*.werguyaram.org` → `<IP du LB>`.
- L'**apex** `werguyaram.org` peut rester sur Firebase Hosting, ou pointer aussi vers `<IP>` (si tu veux tout servir via le LB).
- N'oublie pas le **CNAME `_acme-challenge`** de l'étape B2.

## E. Vérification
- `https://assad.werguyaram.org` ouvre l'espace ASSAD (redirige vers `/espace/assad`).
- Un slug réservé (`www, app, admin, api, chat`) ne doit PAS être utilisé comme partenaire.
- Certificat : état `ACTIVE` ; propagation DNS jusqu'à ~24 h.

## F. CI/CD (à chaque déploiement)
Le LB sert le **bucket**, pas Firebase Hosting. À chaque release :
```bash
npm run build:seo
gsutil -m rsync -r -d dist "gs://$BUCKET"
gcloud compute url-maps invalidate-cdn-cache wy-urlmap --path="/*" --async
```
(Tu peux conserver `firebase deploy --only hosting` en parallèle pour l'apex si tu le laisses sur Firebase.)

## Notes / arbitrages
- **Coût** : LB HTTPS ~18 $/mois + egress/CDN.
- **SEO deep-links** : le bucket renvoie `index.html` en 404 (routing client OK) mais avec un statut HTTP 404 ; comme `build:seo` prérend un `index.html` par route, la plupart des URLs existent en fichier et se résolvent directement.
- **Alternative backend** : Cloud Run (conteneur servant le build avec fallback `index.html`) au lieu du bucket — remplace l'étape A et le backend (`--backend-service` via un serverless NEG). Le bucket est plus simple/économe pour un SPA statique.

---

# Option B-bis — Wildcard via **Cloudflare** (recommandé, sans GCP)

Atteint le même objectif (`*.werguyaram.org` automatique → sous-domaine créé tout
seul à la création d'un espace) **sans Load Balancer GCP, sans IAM, sans migration
de serving**. Le SPA reste sur Firebase Hosting ; Cloudflare proxifie les
sous-domaines via un Worker (voir `infra/cloudflare/wildcard-worker.js`).

## 1. Mettre le domaine sur Cloudflare
1. Crée un compte Cloudflare → **Add a site** → `werguyaram.org` (plan Free OK).
2. Cloudflare scanne le DNS existant : **vérifie que TOUT est réimporté**, surtout :
   - **MX + SPF/email** (ton DNS est chez IONOS → `include:_spf-eu.ionos.com`) — sinon l'email casse.
   - **`chat.werguyaram.org`** (Chatwoot) et tout autre service.
   - L'apex `werguyaram.org` + `www` (Firebase) + le TXT `hosting-site=werguyaram`.
3. **Change les nameservers chez IONOS** vers ceux que Cloudflare te donne. Attends l'activation.

## 2. Enregistrements DNS dans Cloudflare
- **Wildcard** : `*` → **CNAME** `werguyaram.web.app` — **Proxied (nuage orange)**.
- **`chat`** (et autres services) : garde leur cible réelle en **DNS-only (nuage gris)** → le Worker ne s'exécutera PAS dessus.
- **apex / www** : laisse-les sur Firebase comme configuré (le Worker ne route que les sous-domaines).

## 3. SSL
- **SSL/TLS → mode `Full`** (Cloudflare ↔ Firebase en HTTPS).
- **Universal SSL** (activé par défaut) couvre `werguyaram.org` **et** `*.werguyaram.org` (un niveau) → certificat wildcard automatique, rien à gérer.

## 4. Déployer le Worker
- Dashboard Cloudflare → **Workers & Pages → Create Worker** → colle le contenu de
  `infra/cloudflare/wildcard-worker.js` → Deploy.
- **Triggers → Routes** : ajoute la route **`*.werguyaram.org/*`** → ce Worker.
  *(Cette route matche les sous-domaines, pas l'apex.)*

## 5. Tester
- `https://assad.werguyaram.org` → sert l'espace ASSAD (l'app résout le slug `assad`).
- `https://nimporte.werguyaram.org` → sert l'app ; si l'espace n'existe pas, l'app affiche « espace introuvable ».
- **Création auto** : créer un `tenants/<slug>` côté admin suffit → `<slug>.werguyaram.org` marche immédiatement (aucune action DNS/cert par partenaire).

## ⚠️ Points d'attention
- **Connexion Firebase Auth sur les sous-domaines** : le login **email/mot de passe** fonctionne partout. En revanche le **sign-in Google (popup OAuth)** exige que le domaine soit dans **Firebase Auth → Authorized domains**, qui **ne supporte pas les wildcards**. → Les gestionnaires se connectent en email/mot de passe sur leur sous-domaine, ou on autorise quelques sous-domaines spécifiques.
- **Ne pas proxifier `chat` ni les services** (garde-les DNS-only) — sinon le Worker les détourne vers l'app.
- **Email** : revérifie MX/SPF après le changement de nameservers.
- Le Worker (free tier) couvre 100 000 requêtes/jour ; au-delà, plan Workers payant.

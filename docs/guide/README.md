# Guide d'utilisateur Wergu Yaram (PowerPoint)

Ce dossier contient le **guide d'utilisateur complet** de la plateforme Wergu Yaram,
généré au branding officiel, sous forme de présentation PowerPoint éditable.

## Contenu

| Fichier | Description |
|---|---|
| `Wergu_Yaram_Guide_Utilisateur.pptx` | **Livrable final** — la présentation (≈ 40 slides) |
| `Wergu_Yaram_Guide_Utilisateur.pdf` | Export PDF (si LibreOffice est disponible) |
| `screenshots/` | Captures d'écran fraîches de la plateforme |

Le guide couvre les **4 publics** : Grand public & patients, Professionnels de santé,
Partenaires (ONG/institutions) et Administrateurs, plus le démarrage rapide et les annexes
(sécurité, FAQ, glossaire).

## Régénérer le guide

Les scripts source sont dans [`scripts/guide/`](../../scripts/guide/) :

- `capture-screenshots.mjs` — capture les écrans via Playwright (Node)
- `content.py` — le contenu rédactionnel (FR), séparé du rendu
- `build_pptx.py` — le moteur de rendu brandé (couleurs, typo, logo) qui produit le `.pptx`

### 1. Captures d'écran (optionnel — déjà fournies)

```bash
# Terminal A : lancer le site en local
npm run dev          # http://localhost:5173

# Terminal B : capturer les écrans
npx playwright install chromium   # une seule fois
node scripts/guide/capture-screenshots.mjs
```

Les pages protégées (tableau de bord, espace partenaire, admin) nécessitent une connexion :
le script utilise `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` lus depuis `.env.local`
(jamais codés en dur). Si une route échoue, le script bascule automatiquement sur une
capture existante de `screenshots/` ou une maquette Figma-like, et le signale dans le
récapitulatif final.

### 2. Construire le PowerPoint

```bash
python3 scripts/guide/build_pptx.py
```

Dépendances Python : `python-pptx` et `Pillow` (déjà installées).

### 3. Export PDF (optionnel)

```bash
soffice --headless --convert-to pdf --outdir docs/guide docs/guide/Wergu_Yaram_Guide_Utilisateur.pptx
```

## Branding appliqué

- **Couleurs** : vert `#007A5E`, teal `#00B894`, navy `#0B1F49`, mint `#EEFDF8`, fond `#F7FBFA`.
- **Typo** : **Inter** (à installer sur le poste de lecture pour un rendu 100 % fidèle ;
  sinon PowerPoint substitue automatiquement).
- **Logo** : `public/logo.png`.
- **Accent par rôle** : public = vert, pro = teal, partenaire = navy, admin = indigo.

> Remarque : la plateforme est un MVP haute-fidélité. Le guide décrit le **parcours
> utilisateur cible** tel que présenté par l'interface ; certaines actions d'écriture
> peuvent ne pas encore être persistées côté back-end.

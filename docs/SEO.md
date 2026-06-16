# SEO & aperçus de partage social — Guide

Ce projet est une SPA Vite + React rendue côté client. Les crawlers sociaux
(Facebook, WhatsApp, LinkedIn, Twitter/X) n'exécutent pas le JavaScript : on
**prérend** donc chaque route au build pour qu'ils voient un `<head>` complet.

## Architecture

| Pièce | Rôle |
|-------|------|
| [`src/seo/SEOHead.tsx`](../src/seo/SEOHead.tsx) | Composant universel : title, description, canonical, robots, Open Graph, Twitter Cards, JSON-LD. Rendu en tête de **chaque** page. |
| [`src/seo/config.ts`](../src/seo/config.ts) | Constantes de marque (nom du site, image OG par défaut, couleur, handles sociaux). |
| [`src/seo/siteUrl.ts`](../src/seo/siteUrl.ts) | Construit les URLs absolues à partir de `VITE_SITE_URL`. |
| [`src/seo/jsonld.ts`](../src/seo/jsonld.ts) | Générateurs Schema.org (Article, Drug, MedicalCondition, Hospital, Event, BreadcrumbList…). |
| [`src/seo/routes.ts`](../src/seo/routes.ts) | Manifeste de routes (build only) : liste prérendue, images OG à générer, entrées sitemap. Dérivé des mêmes mock data que l'app. |
| [`scripts/prerender.mjs`](../scripts/prerender.mjs) | Sert `dist/` via `vite preview`, visite chaque route avec Playwright, écrit le HTML baked. |
| [`scripts/og-images.mjs`](../scripts/og-images.mjs) | Génère les images OG 1200×630 pour les contenus sans visuel. |
| [`scripts/sitemap.mjs`](../scripts/sitemap.mjs) | Génère `dist/sitemap.xml`. |
| [`src/components/ShareButtons.tsx`](../src/components/ShareButtons.tsx) | Boutons de partage (WhatsApp, Facebook, X, LinkedIn, Telegram, Email, copier). |

## Build & déploiement

```bash
npm run build:seo   # build + images OG + sitemap + prérendu → dist/
firebase deploy --only hosting
```

`npm run build` reste le build rapide (sans SEO) pour le dev. Le prérendu et les
images OG s'exécutent uniquement via `build:seo`.

## Configuration

`VITE_SITE_URL` (dans `.env.local`) = origine canonique sans slash final, ex.
`https://werguyaram.org`. Utilisée pour toutes les URLs absolues (OG,
canonical, sitemap). **À mettre à jour si le domaine change** (et dans
`public/robots.txt`).

## Ajouter du contenu

Le manifeste de routes et les listes sont dérivés des `src/data/mock*.ts` : un
nouveau médicament/article/etc. est **automatiquement** prérendu, imagé et mis au
sitemap au prochain `build:seo`. Rien à câbler à la main.

Pour une **nouvelle page** :

1. Rendre `<SEOHead title="…" description="…" … />` en tête de la page.
2. Passer un `jsonLd` adapté (voir `src/seo/jsonld.ts`).
3. Ajouter sa route à `staticEntries`/`dynamicEntries` dans `src/seo/routes.ts`.
4. Pages privées (auth, dashboard) : `noIndex` et exclues du prérendu.

## Règles

- L'image OG fait **1200×630**, URL **absolue HTTPS**. Les contenus avec `cover`
  réutilisent leur image ; les autres ont une image templated `dist/og/<type>-<slug>.png`.
- Jamais de balise vide (`content=""`) ni de title/description dupliqués.
- Après déploiement, forcer le re-crawl via les debuggers (Facebook met en cache) :
  - Facebook : https://developers.facebook.com/tools/debug/
  - Twitter : https://cards-dev.twitter.com/validator
  - LinkedIn : https://www.linkedin.com/post-inspector/
  - JSON-LD : https://validator.schema.org/

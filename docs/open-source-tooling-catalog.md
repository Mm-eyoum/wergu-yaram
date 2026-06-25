# Catalogue d'outils open source intégrables — Wergu Yaram

> Rapport de référence. Contrainte : **serverless/managé** (aucun VPS à administrer).
> Objectif : équilibrer **réduction des coûts** et **nouvelles fonctionnalités**.
> Dernière revue : 2026-06.

## Contexte

La plateforme Wergu Yaram (React 18 + TypeScript + Vite, backend Firebase/Cloud
Functions Node 20) est **déjà très orientée open source** : cartes Leaflet/OSM,
géocodage Photon + Nominatim, support Chatwoot auto-hébergé, recherche Typesense,
auth/DB/hosting Firebase.

### Centres de coûts actuels (SaaS facturé à l'usage)
| Service | Rôle | Modèle de coût |
|---|---|---|
| Typesense Cloud | recherche full-text | métré (req/stockage) |
| Brevo | emails transactionnels | métré /email |
| Google Places API | import annuaire (admin) | métré /requête (N+1 par lieu) |
| Bictorys | paiements mobile money | ~1,2 %/transaction |
| Firebase (Firestore/Storage/Functions/Hosting) | backend | métré (lectures, egress, invocations) |
| GA4 | analytics web | gratuit |

### Déjà optimisé (à NE PAS toucher)
Leaflet + OSM (cartes), Photon/Nominatim (géocodage), Chatwoot (support, déjà
auto-hébergé), Firebase Auth, TanStack Query (cache serveur), Vitest + Playwright (tests).

### Légende
- **Licence** : MIT/Apache = permissif, sans risque juridique.
- **Maturité** : ⭐⭐⭐ = standard de facto / ⭐⭐ = solide, large adoption / ⭐ = émergent fiable.
- **Serverless** : ✅ lib npm dans l'app · 🟢 tier gratuit managé · ⚠️ exigerait de l'ops (donc **hors périmètre**, listé pour mémoire).

---

## A. Réduction de coûts (priorité économies)

### A1. Recherche — remplacer Typesense Cloud par un index in-browser
**Constat** : la plateforme **bundle déjà un index mock** côté client en fallback.
Pour des volumes modestes (annuaire d'établissements, contenus), un moteur de
recherche **dans le navigateur** supprime totalement la facture Typesense Cloud.

| Outil | Quoi | Licence | Maturité | Serverless | Économie |
|---|---|---|---|---|---|
| **Orama** | moteur de recherche full-text + vectoriel 100 % JS, tourne dans le navigateur/Worker | Apache-2.0 | ⭐⭐ (tendance) | ✅ | élimine Typesense Cloud |
| **FlexSearch** | index full-text JS ultra-rapide, très léger | Apache-2.0 | ⭐⭐⭐ | ✅ | idem |
| **Fuse.js** | recherche floue simple (petits jeux) | Apache-2.0 | ⭐⭐⭐ | ✅ | idem |
| MeiliSearch | alternative à Typesense | MIT | ⭐⭐⭐ | ⚠️ (self-host) | hors périmètre |

**Reco** : générer l'index au build (script existant `typesense-index.ts` réutilisable
pour produire un JSON), servir le `.json` via Firebase Hosting (gratuit, mis en
cache 1 an), charger Orama/FlexSearch côté client. Garder Typesense uniquement si
le catalogue dépasse ~50–100k documents. **Plus gros gain serverless.**

### A2. Import annuaire — remplacer Google Places API par OpenStreetMap
| Outil | Quoi | Licence | Maturité | Serverless | Économie |
|---|---|---|---|---|---|
| **Overpass API** | requêtes sur la base OSM (hôpitaux, pharmacies, cliniques par zone) | ODbL (data) | ⭐⭐⭐ | 🟢 (endpoint public) | élimine la facture Places |
| **Nominatim (public)** | recherche/géocodage (déjà utilisé) | open | ⭐⭐⭐ | 🟢 | — |
| **healthsites.io** | base ouverte d'établissements de santé (Afrique) | ODbL | ⭐⭐ | 🟢 | source d'import gratuite |

**Reco** : pour l'import en masse d'établissements, interroger Overpass
(`amenity=hospital|clinic|pharmacy|doctors`) + healthsites.io au lieu de Places
Text/Details (qui fait N+1 appels facturés). Garder Places uniquement pour
enrichissements ponctuels. ⚠️ respecter la licence ODbL (attribution OSM).

### A3. Emails transactionnels — alternatives au tier facturé Brevo
| Outil | Quoi | Licence | Maturité | Serverless | Note |
|---|---|---|---|---|---|
| **react-email** | composer des emails en composants React (templates versionnés) | MIT | ⭐⭐ (tendance) | ✅ | améliore la qualité quel que soit le fournisseur |
| **Resend** | API d'envoi, 3 000 emails/mois gratuits, excellent DX | (SDK MIT) | ⭐⭐ | 🟢 | alternative directe à Brevo |
| **AWS SES** | envoi à très bas coût (~0,10 $/1000) | — | ⭐⭐⭐ | 🟢 | le moins cher à l'échelle |
| Listmonk | newsletters/campagnes en masse | AGPL | ⭐⭐ | ⚠️ self-host | hors périmètre |

**Reco** : adopter **react-email** pour les templates (reçus de don, bienvenue,
relances) ; rester sur le **tier gratuit Brevo** (300/j) ou basculer le moteur
d'envoi vers **Resend** (3k/mois gratuits) si volume faible. ⚠️ ne pas
auto-héberger le SMTP (risque de délivrabilité).

### A4. Coûts Firebase — réduire egress Storage et lectures Firestore
| Outil | Quoi | Licence | Serverless | Économie |
|---|---|---|---|---|
| **images.weserv.nl** | proxy de redimensionnement/optimisation d'images (backé par libvips OSS), gratuit | open | 🟢 | coupe l'egress Firebase Storage (sert WebP/AVIF redimensionnés) |
| **@unpic/react** | `<img>` responsive multi-CDN, lazy, srcset auto | MIT | ✅ | réduit la bande passante images |
| **Cloudflare (tier gratuit)** | CDN/cache devant Firebase Hosting | — | 🟢 | coupe l'egress Hosting |
| **TanStack Query** (déjà présent) | mieux configurer `staleTime`/`gcInfinity` | MIT | ✅ | réduit les lectures Firestore facturées |

**Reco** : router les images Storage via `images.weserv.nl` (format `auto`, width
adaptée) + `@unpic/react` pour le srcset ; augmenter `staleTime` sur les requêtes
TanStack Query peu volatiles (annuaire, contenus) pour diminuer les lectures.

---

## B. Nouvelles fonctionnalités (priorité capacités)

### B1. Internationalisation (actuellement : texte FR en dur) — fort enjeu Sénégal
| Outil | Quoi | Licence | Maturité | Serverless | Apport |
|---|---|---|---|---|---|
| **i18next + react-i18next** | i18n standard, pluriels, namespaces, détection langue | MIT | ⭐⭐⭐ | ✅ | FR / Wolof / EN |
| **@formatjs / react-intl** | alternative ICU (formats dates/nombres) | BSD | ⭐⭐⭐ | ✅ | idem |
| **Lingui** | i18n léger, extraction auto des messages | MIT | ⭐⭐ | ✅ | DX moderne |

**Reco** : **react-i18next** — mature, écosystème riche, permet d'ajouter le
**Wolof** et l'anglais. Améliore l'accessibilité linguistique et le SEO multilingue.

### B2. Analytics produit + remplacement potentiel de GA4
| Outil | Quoi | Licence | Maturité | Serverless | Apport |
|---|---|---|---|---|---|
| **PostHog** | analytics produit + session replay + feature flags + A/B + funnels | MIT | ⭐⭐⭐ (tendance) | 🟢 (cloud, ~1M évts/mois gratuits) | remplace GA4 + flags + tests A/B, sans serveur |
| **Umami** | analytics web léger, respectueux vie privée | MIT | ⭐⭐ | 🟢 (cloud) / ⚠️ self-host | alternative GA4 RGPD |
| **Plausible** | analytics simple, RGPD | AGPL | ⭐⭐ | ⚠️ self-host (cloud payant) | hors périmètre coût |

**Reco** : **PostHog Cloud** (tier gratuit généreux) — un seul SDK couvre
analytics produit, **session replay** (debug UX), **feature flags** et **A/B
testing**. Peut compléter ou remplacer GA4 et le slot Sentry vide.

### B3. Suivi d'erreurs (slot `VITE_SENTRY_DSN` présent mais inutilisé)
| Outil | Quoi | Licence | Maturité | Serverless | Apport |
|---|---|---|---|---|---|
| **Sentry (tier gratuit)** | suivi erreurs + perfs, SDK open source | (SDK MIT/BSL) | ⭐⭐⭐ | 🟢 (5k erreurs/mois gratuits) | remplit le slot DSN existant |
| **PostHog Error Tracking** | erreurs intégrées si déjà PostHog | MIT | ⭐⭐ | 🟢 | mutualise l'outillage |
| GlitchTip | compatible SDK Sentry | MIT | ⭐⭐ | ⚠️ self-host | hors périmètre |

**Reco** : activer **Sentry tier gratuit** (le code prévoit déjà `VITE_SENTRY_DSN`),
ou centraliser sur PostHog si adopté en B2.

### B4. UI / accessibilité (actuellement : composants Tailwind maison)
| Outil | Quoi | Licence | Maturité | Serverless | Apport |
|---|---|---|---|---|---|
| **shadcn/ui** | composants copier-coller sur Radix + Tailwind (déjà votre stack) | MIT | ⭐⭐⭐ (tendance) | ✅ | a11y + cohérence, zéro dépendance runtime |
| **Radix UI** | primitives accessibles (dialog, menu, tooltip) | MIT | ⭐⭐⭐ | ✅ | base de shadcn |
| **Headless UI** | primitives Tailwind officielles | MIT | ⭐⭐ | ✅ | alternative |

**Reco** : **shadcn/ui** — s'intègre parfaitement (Tailwind + Radix), améliore
l'accessibilité (WCAG) des modales/menus/formulaires sans alourdir le bundle.

### B5. Formulaires + validation (actuellement : `useState` manuel)
| Outil | Quoi | Licence | Maturité | Serverless | Apport |
|---|---|---|---|---|---|
| **React Hook Form** | gestion de formulaires performante | MIT | ⭐⭐⭐ | ✅ | moins de re-renders, validation propre |
| **Zod** | schémas TypeScript runtime | MIT | ⭐⭐⭐ (tendance) | ✅ | schémas **partagés** app ↔ Cloud Functions |

**Reco** : **React Hook Form + Zod**. Zod sert aussi à valider les payloads des
Cloud Functions (dons, webhooks) et les documents Firestore — un seul schéma
côté client et serveur.

### B6. Dashboards & graphiques (admin/partenaires)
| Outil | Quoi | Licence | Maturité | Serverless | Apport |
|---|---|---|---|---|---|
| **Tremor** | composants dashboard (charts + KPI) sur Tailwind + Recharts | Apache-2.0 | ⭐⭐ (tendance) | ✅ | dashboards partenaires/GA4 rapides |
| **Recharts** | graphiques React déclaratifs | MIT | ⭐⭐⭐ | ✅ | base solide |
| **Nivo / visx** | dataviz avancée | MIT | ⭐⭐ | ✅ | besoins fins |

**Reco** : **Tremor** (au-dessus de Recharts) pour les espaces partenaires
(trafic GA4, revenus) — cohérent avec Tailwind.

### B7. Cartographie vectorielle (au-delà de Leaflet raster)
| Outil | Quoi | Licence | Maturité | Serverless | Apport |
|---|---|---|---|---|---|
| **MapLibre GL JS** | cartes vectorielles (fork open de Mapbox GL) | BSD-3 | ⭐⭐⭐ (tendance) | ✅ | rendu fluide, styles personnalisés |
| **PMTiles / Protomaps** | fond de carte vectoriel dans **un seul fichier** servi en HTTP range | BSD | ⭐⭐ (tendance) | ✅ (fichier sur Storage/CDN) | basemap auto-contenu, sans serveur de tuiles |

**Reco** : option d'évolution — **MapLibre + PMTiles** (fichier `.pmtiles` du
Sénégal hébergé sur Firebase Storage) donne un fond vectoriel rapide et gratuit,
sans dépendre des tuiles raster OSM. À considérer si l'UX carte devient centrale.

### B8. Notifications & PDF
| Outil | Quoi | Licence | Maturité | Serverless | Apport |
|---|---|---|---|---|---|
| **Firebase Cloud Messaging** | push web/in-app (déjà dans Firebase) | — | ⭐⭐⭐ | 🟢 (gratuit) | notifications sans nouveau service |
| **Novu** | orchestration multicanale (email/SMS/push/in-app) | MIT | ⭐⭐ | 🟢 (cloud) / ⚠️ self-host | unifie Brevo + Chatwoot + push |
| **@react-pdf/renderer** | génération PDF en React | MIT | ⭐⭐ | ✅ | reçus de don côté client/Function |
| **pdf-lib** | manipulation PDF bas niveau | MIT | ⭐⭐⭐ | ✅ | idem |

**Reco** : **FCM** pour le push (déjà disponible) ; **@react-pdf/renderer** pour
les reçus de dons (évite des dépendances lourdes).

### B9. Workflows & jobs événementiels (alléger les Cloud Functions)
| Outil | Quoi | Licence | Maturité | Serverless | Apport |
|---|---|---|---|---|---|
| **Inngest** | fonctions durables / workflows événementiels, retries, cron | (SDK Apache-2.0) | ⭐⭐ (tendance) | 🟢 (cloud, tier gratuit) | simplifie relances dons, campagnes, agrégations |
| n8n | automatisation visuelle | fair-code | ⭐⭐ | ⚠️ self-host | hors périmètre |

**Reco** : **Inngest** (tier gratuit managé) si la logique des Cloud Functions
planifiées/événementielles (relances d'abonnement, campagnes, rollups) devient
difficile à maintenir — retries et observabilité intégrés, sans serveur.

### B10. Anti-abus (alternative à reCAPTCHA v3, déjà gratuit)
| Outil | Quoi | Licence | Serverless | Apport |
|---|---|---|---|---|
| **Cloudflare Turnstile** | CAPTCHA invisible, gratuit, respectueux vie privée | — | 🟢 | alternative reCAPTCHA (UX + RGPD) ; faible priorité (App Check déjà gratuit) |

---

## C. Synthèse — priorisation (gain vs effort, serverless)

| # | Action | Type | Effort | Impact |
|---|---|---|---|---|
| 1 | Index recherche in-browser (Orama/FlexSearch) → couper Typesense Cloud | Coût | Moyen | **Élevé** |
| 2 | Import annuaire via Overpass/healthsites.io → couper Google Places | Coût | Moyen | **Élevé** |
| 3 | i18n react-i18next (FR/Wolof/EN) | Fonctionnalité | Moyen | **Élevé** |
| 4 | Images via weserv.nl + @unpic → couper egress Storage | Coût | Faible | Moyen |
| 5 | PostHog Cloud (analytics produit + replay + flags + A/B) | Fonctionnalité | Faible | **Élevé** |
| 6 | React Hook Form + Zod (formulaires + schémas partagés) | Fonctionnalité | Moyen | Moyen |
| 7 | shadcn/ui + Radix (a11y) | Fonctionnalité | Moyen | Moyen |
| 8 | Activer Sentry tier gratuit (slot DSN déjà prévu) | Fonctionnalité | Faible | Moyen |
| 9 | react-email + (Resend/Brevo gratuit) pour templates | Coût/Fonctionnalité | Faible | Moyen |
| 10 | Tremor pour dashboards partenaires | Fonctionnalité | Faible | Moyen |
| 11 | MapLibre + PMTiles (carte vectorielle) | Fonctionnalité | Élevé | Moyen |
| 12 | Inngest pour workflows événementiels | Fonctionnalité | Moyen | Moyen |

### Hors périmètre (nécessitent un VPS — exclus par la contrainte serverless)
Typesense/MeiliSearch self-hosted, Plausible/Umami/Matomo self-hosted, Listmonk,
n8n, GlitchTip, Uptime Kuma, Postal/Maddy (SMTP). Migration Firebase → Supabase/
Appwrite/PocketBase : réécriture majeure, **non** une « intégration » — à écarter.

### Risques & précautions
- **Licences data OSM/Overpass/healthsites = ODbL** → attribution obligatoire.
- **Délivrabilité email** : ne pas auto-héberger le SMTP ; rester sur un envoyeur managé.
- **PostHog/Sentry/Resend cloud** : tiers gratuits suffisants au volume actuel, surveiller les quotas.
- **Index in-browser** : adapté tant que le catalogue reste < ~50–100k documents ; au-delà, conserver Typesense.

---

*Toute intégration listée (ex. #1, #2, #3) ferait l'objet d'un plan dédié séparé sur demande.*

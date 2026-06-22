# Stratégie de croissance des partenariats & verticales — Wergu Yaram

> Proposition d'analyste + roadmap. Élaborée à partir de la **Présentation Wergu Yaram 2026**
> ([Présentation Wergu Yaram - 2026.pdf](Présentation%20Wergu%20Yaram%20-%202026.pdf)) et d'un audit du code.
> Objectif : maximiser le nombre de partenaires santé (modèle ASSAD), donner aux communautés des
> avantages **réels et mesurables**, et ouvrir une verticale **bien-être & sport**.

## Contexte

Wergu Yaram est l'**initiative sociétale d'Eyone Medical** (éditeur du Système d'Information Médical National du Sénégal, lauréat Africa's Business Heroes 2024-2025), dédiée à la digitalisation responsable de la santé (focus **ODD 3**). La présentation 2026 définit une **grille de 8 catégories de partenaires** (chacune avec *Exemples / Impact / Ce qu'ils gagnent*) et un modèle phare : le **« Kit Digital ASSAD »** (Association Sénégalaise de Soutien et d'Assistance aux Diabétiques) — un **sous-domaine brandé `assad.werguyaram.org`** avec CMS, communauté, référentiel pathologie et campagnes SMS/WhatsApp.

**Décision d'architecture retenue** : espaces partenaires en **sous-domaines multi-tenant**. **Décision SMS/WhatsApp** : s'appuyer sur **Chatwoot** (omnicanal déjà conçu/câblé) + une couche de ciblage/consentement côté plateforme.

---

## A. Audit de conformité — Deck 2026 vs plateforme réelle

| Promesse du deck | État | Preuve / écart |
|---|---|---|
| Portail santé central, contenus validés par médecins | ✅ Conforme | `articles`/`pathologies`/`medications` + `TrustMeta.verified` ; modération + audit. |
| Réseau social santé : forums, messagerie | ✅ Conforme | `forumThreads`, `conversations` (messagerie 1-1). |
| Annuaire + communautés, événements, dons | ✅ Conforme | Organizations/annuaire, `communities`, `events` (+ landing/billetterie), `equipmentNeeds`+Bictorys. |
| Tableaux de bord live (projets/dons) | 🟡 Partiel | Dashboard user + `/admin/revenue` ; **pas de dashboard partenaire**. |
| **Sous-domaines partenaires multi-tenant** (`assad.werguyaram.org`, branding ASSAD) | ❌ Absent | Aucun routing par hôte, aucun thème par partenaire (`src/App.tsx`, `src/services/siteConfig.ts` = config globale unique). **Différenciateur phare du deck.** |
| **Comptes par rôle : patient, pro de santé, donateur, admin** | 🟡 Partiel | `Role = patient_public\|editor\|admin\|super_admin`. Pas de rôle **professionnel de santé** ; « donateur » n'est qu'un *type de page* (`partner_donor`), pas un compte. |
| **Formations / e-learning / webinaires** | ❌ Absent | Aucune entité `formation`/`cours` ; les webinaires ne sont que des events « En ligne ». |
| **Communautés par pathologie (MNT) + suggestion auto au signup** | 🟡 Partiel | `interests` collectés au signup mais **aucune suggestion/adhésion auto** ; `Pathology.communitySlug` existe, non exploité. |
| **Intégrations SMS & WhatsApp (campagnes ciblées)** | 🟡 En cours (canal), ❌ campagnes | **Chatwoot omnicanal déjà conçu/câblé** (widget web, identité HMAC, webhook→notifs, push formulaires) avec **WhatsApp via Meta Cloud API** prévu ([chatwoot-setup.md](chatwoot-setup.md), `chatwoot*` Functions). Manque : **orchestration des campagnes sortantes ciblées** (segmentation + consentement + templates). |
| **Impact mesurable + « Comités »** | ❌ Absent | `EquipmentNeed.impact` = texte libre, pas de KPI ; aucune entité comité/gouvernance ; pas de reporting d'impact partenaire. |
| Fil d'actualité unifié + notifications push | 🟡 Partiel | Posts communautaires + forum existent ; **pas de fil personnalisé**, pas de FCM. |

**Verdict** : la plateforme couvre solidement les piliers *contenu / communauté / annuaire / dons / événements*, mais **les différenciateurs qui attirent les partenaires et prouvent l'impact ne sont pas construits** : multi-tenant partenaire, rôles vérifiés, formations, campagnes SMS/WhatsApp, et surtout la **couche d'impact mesurable**. Ce sont précisément les colonnes *« Ce qu'ils gagnent »* du deck.

---

## B. Stratégie — « Moteur de valeur partenaire » : 8 catégories → fonctionnalités → avantages mesurables

| # | Catégorie partenaire | Fonctionnalité Wergu Yaram | Avantage mesurable (KPI) |
|---|---|---|---|
| 1 | **Institutionnels (Publics)** — ministères, agences, collectivités | Espace institutionnel + **dashboard territorial agrégé/anonymisé** (prévention, dépistage par région), rapports nationaux exportables | # personnes touchées/région, # campagnes prévention, taux de dépistage communautaire |
| 2 | **Techniques & Médicaux** — télécoms, IT, entreprises tech | API & intégrations, co-création, annuaire pro vérifié | # structures digitalisées, # intégrations actives |
| 3 | **Technologiques & Télécoms** — équipementiers, éditeurs e-santé, MedTech | Écosystème d'intégrations, sponsoring connectivité zones rurales | # zones rurales couvertes, # solutions co-créées |
| 4 | **Financiers & Bailleurs** — banques (Ecobank), fonds, fondations | **Dashboard ESG/impact** : traçabilité don→équipement livré, rapports ESG exportables | Fonds investis → équipements livrés, ROI social, conformité ESG |
| 5 | **Communautaires & Sociétaux** — assos (**ASSAD**), ONG, leaders | **Espace partenaire multi-tenant brandé** (Kit Digital) : CMS, communauté, campagnes SMS/WhatsApp | # membres, # messages prévention délivrés, taux d'engagement, # événements |
| 6 | **Académiques & Formation** — universités, instituts, centres | **Plateforme de formations / e-learning + webinaires + certifications** | # apprenants, taux de complétion, # certifiés |
| 7 | **Médias & Communication** — médias trad. & digitaux | Rubriques sponsorisées (déjà), co-branding, hub de contenu, newsletter | Portée (impressions), # contenus, croissance d'audience |
| 8 | **Bénéficiaires directs (Patients & Citoyens)** | Profil santé + **communautés par pathologie** + suivi + rappels SMS/WhatsApp | # inscrits, rétention, # adhésions communautés, accès facilité aux soins |

---

## C. Fonctionnalités proposées (détail)

### C.1 — 🚩 Espaces partenaires multi-tenant (sous-domaines) — *le Kit Digital ASSAD*
Le partenaire (ASSAD, ONG, fondation, fédération sportive…) dispose de **`<partenaire>.werguyaram.org`**, brandé à ses couleurs, agrégeant **sa** communauté, **ses** contenus, **ses** événements, **ses** campagnes — tout en restant sur l'infrastructure et la base de confiance Wergu Yaram.
- **Résolution de tenant par hôte** : middleware au bootstrap (`src/main.tsx`/`App.tsx`) lit le sous-domaine → charge un `Tenant` (collection `tenants/{slug}` : `name, partnerOrgId, theme{logo,colors,banner}, communitySlugs[], featureFlags, domain`).
- **Thème par tenant** : généraliser `src/services/siteConfig.ts` (`AppearanceConfig`) en config **par tenant**. Le portail principal = tenant « default ».
- **Périmètre de données** : un tenant *cadre et agrège* du contenu existant (taggé `tenantSlug`) — pas une base isolée. Réutilise `Organization` comme entité « partenaire propriétaire ».
- **Infra** (hors-code) : DNS **wildcard `*.werguyaram.org`**, **SSL wildcard**, Firebase Hosting multi-domaine, `canonical` + sitemaps par tenant (SEO).
- **Réutilise** : `src/services/organizations.ts`, Communities, registre CMS (`src/admin/content/entries/`), `siteConfig`.

### C.2 — Rôles vérifiés : Professionnel de santé & Donateur
- Étendre `Role` → **`health_pro`** (badge « Professionnel vérifié », vérification ordre/diplôme par admin) — crédibilise forum/contenus.
- **Donateur** : badge dérivé des `transactions` (pas un rôle de sécurité) — page « Mes dons & impact », reçus, mur de remerciement.
- **Réutilise** : `src/lib/permissions.ts`, `firestore.rules`, `transactions`.

### C.3 — Communautés par pathologie (MNT) + suggestion automatique au signup
- Au signup (`src/pages/Register.tsx`), **cases à cocher MNT/pathologies** (taxonomie typée, façon `src/lib/facilityTaxonomy.ts`) → **suggestions automatiques de communautés** (mapping pathologie→`communitySlug`) → adhésion en 1 clic (réutilise `memberships`, `src/services/userData.ts`).
- Lier explicitement `Community` ↔ pathologie (champ `pathologySlugs[]` + champ CMS).

### C.4 — Formations / e-learning / webinaires (nouveau vertical de contenu)
- Nouveau `ContentType "formation"` + entité `Formation` (modules, durée, niveau, vidéo, quiz, certificat) via le **registre CMS**. Webinaires = formation « live » liée à un event.
- **Réutilise** : registre CMS (`src/admin/content/entries/index.ts`), `src/services/catalog.ts`, recherche (`src/lib/searchFilters.ts`).

### C.5 — 🆕 Vertical Bien-être & Sport (élargit la base de partenaires)
Positionnement **prévention des MNT** (diabète/hypertension via activité physique & nutrition) — cohérent ODD 3.
- **Nouveaux contenus/communautés** : bien-être, nutrition, activité physique, santé mentale ; **événements sportifs** (marches/courses santé, journées dépistage+sport) ; **programmes/défis**.
- **Nouveaux types de partenaires** : salles de sport & fédérations sportives, nutritionnistes/diététiciens, coachs bien-être, **mutuelles/assureurs**, marques nutrition/agroalimentaire santé.
- **Réutilise** : taxonomie + verticales de contenu (C.4), espaces partenaires (C.1), événements/billetterie.

### C.6 — Campagnes SMS & WhatsApp ciblées — sur Chatwoot (omnicanal existant)
**Chatwoot est la colonne vertébrale** (déjà conçu/câblé : widget, identité HMAC, webhook→notifs, **WhatsApp via Meta Cloud API**, cf. [chatwoot-setup.md](chatwoot-setup.md)).
- **Conversationnel / 2 sens** : WhatsApp (Meta Cloud API) déjà prévu ; **ajouter une inbox SMS** (Twilio/Bandwidth). **Bonus multi-tenant** : 1 **Team/Inbox Chatwoot par partenaire**.
- **Campagnes sortantes ciblées** : **côté Wergu Yaram**, couche **ciblage + consentement (opt-in)** (segments par pathologie/zone/communauté, programmation, désinscription) → livraison via **API Chatwoot** (template WhatsApp approuvé hors fenêtre 24 h) ou **WhatsApp Cloud API / agrégateur SMS local** pour le volume — derrière une **abstraction de fournisseur** (esprit du pattern Brevo).

### C.7 — 🚩 Couche d'impact mesurable + « Comités »
**L'avantage « réel et mesurable » demandé.**
- **Dashboard d'impact partenaire** : KPIs réutilisant les `StatCard`/patterns de `src/pages/admin/Revenue.tsx` — membres, messages de prévention délivrés, événements, dons→équipements, apprenants, portée.
- **Reporting d'impact exportable** (PDF, via `scripts/business-pdf.mjs`) pour bailleurs (ESG) & institutionnels.
- **« Comités »** : entité `committee` (groupe multi-acteurs rattaché à un tenant/programme) qui pilote et **valide les indicateurs**.

### C.8 — Fil d'actualité + notifications
- Fil personnalisé (posts des communautés rejointes + événements + campagnes) ; notifications in-app → FCM push + SMS/WhatsApp.

---

## D. Avantages mesurables — synthèse par acteur
- **Communautés / associations (ASSAD, ONG)** : espace brandé + audience + campagnes → *# membres, # messages prévention délivrés, engagement, événements, dons collectés*.
- **Bailleurs / financiers (Ecobank…)** : *traçabilité fonds→impact*, conformité **ESG**, ROI social mesuré.
- **Institutionnels** : *couverture territoriale, dépistage, prévention* agrégés (anonymisés).
- **Académiques** : *# apprenants, certifiés, complétion*.
- **Patients** : *accès, suivi, rétention, adhésions communautés*.

---

## E. Modèle économique des partenariats
- **Espace partenaire** = offre payante (abonnement tenant / « Pacte-Convention ») au-dessus des plans pages (réutilise `pricingPlans`/`subscriptions`).
- **Bailleurs/institutionnels** : conventions sur devis (ligne Data/B2B + reporting d'impact).
- **Médias/sponsors** : rubriques sponsorisées (déjà livré) + co-branding tenant.
- **Bien-être/sport** : abonnements partenaires + billetterie événements + sponsoring.
- Cohérent avec le registre `transactions`/`revenueReports` existant.

---

## F. Roadmap priorisée

| Phase | Contenu | Pourquoi d'abord | Effort |
|---|---|---|---|
| **P1 — Crédibilité & activation partenaires** | Rôle `health_pro` vérifié ; communautés↔pathologie + suggestion au signup ; badge/page donateur | Faible effort, fort signal de confiance ; comble des écarts du deck | M |
| **P2 — 🚩 Espaces partenaires multi-tenant** (Kit ASSAD) | Tenant + thème par hôte, sous-domaines, espace brandé agrégé ; provisioning DNS/SSL wildcard | Différenciateur phare ; débloque l'acquisition de partenaires | L–XL |
| **P3 — Campagnes SMS/WhatsApp (via Chatwoot) + consentement** | Inbox par partenaire (Team Chatwoot) ; couche ciblage/opt-in ; envoi via API Chatwoot / WhatsApp Cloud API / SMS | Réutilise l'omnicanal déjà câblé ; cœur du Kit ASSAD | M |
| **P4 — Couche d'impact + Comités** | Dashboards d'impact partenaire + rapports ESG exportables + entité comité | Rend les avantages « mesurables » ; clé bailleurs | L |
| **P5 — Formations / e-learning** | Vertical `formation` + webinaires + certifications | Active la catégorie académique | M–L |
| **P6 — Vertical Bien-être & Sport** | Contenus/communautés/événements + nouveaux types de partenaires | Élargit la base au-delà du clinique | M–L |
| **P7 — Fil d'actualité + notifications push** | Feed personnalisé + FCM | Rétention transverse | M |

**Quick wins (P1, semaines 1-3)** : suggestion de communautés par pathologie au signup ; badge professionnel vérifié ; page « Mes dons & impact ».

---

## G. Risques & conformité
- **Multi-tenant** : DNS + **SSL wildcard**, isolation logique des données (filtrage `tenantSlug` côté règles), SEO multi-domaine (canonical, sitemaps), gouvernance de marque.
- **SMS/WhatsApp (via Chatwoot)** : **consentement opt-in** + désinscription, conformité **CDP Sénégal** ; WhatsApp **templates approuvés Meta** + **fenêtre 24 h** ; coûts/message ; anti-spam ; maintenance de l'instance Chatwoot auto-hébergée.
- **Rôle professionnel de santé** : processus de **vérification** (diplôme/ordre).
- **Contenu médical** : validation médicale + non-promotion de médicaments (déjà en place).
- **Données d'impact institutionnelles** : agrégation **anonymisée** (le clinique reste dans Eyone Medical Suite).
- **ESG/bailleurs** : méthodologie d'indicateurs auditable.

---

## H. Architecture multi-tenant — points de réutilisation
- **Tenant resolver** : `window.location.hostname` au bootstrap → `tenants/{slug}` ; fallback portail principal. Contexte `TenantProvider` (calque de `AuthProvider`).
- **Thème** : étendre `AppearanceConfig`/`siteConfig` en *par-tenant* (logo, variables CSS, menus, bannière).
- **Entité propriétaire** : `Organization` (partenaire) ↔ `Tenant` (1-1) ; gestion via dashboard (réutilise `ManagePage`/permissions).
- **Contenu** : taguer communautés/événements/articles d'un `tenantSlug` optionnel ; portail principal agrège, espace tenant filtre.
- **Hosting** : Firebase Hosting + wildcard ; routing par hôte côté client (+ prerender/sitemap par tenant).
- **Omnicanal par tenant** : chaque partenaire = une **Team/Inbox Chatwoot** dédiée (WhatsApp/SMS/email/web), cf. [chatwoot-setup.md](chatwoot-setup.md).

---

## Prochaine étape
Chaque phase (P1→P7) fera l'objet d'un **plan d'implémentation dédié** au moment de sa construction (avec vérification typecheck/lint/tests/règles). Recommandation : démarrer par les **quick wins P1**, puis le différenciateur **P2 (espaces partenaires)** dès qu'un partenaire pilote (type ASSAD) est engagé.

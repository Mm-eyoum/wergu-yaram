# Wergu Yaram — Analyse Business Model & Scaffold de Monétisation

> Document stratégique + plan technique. Analyse réalisée à partir d'un audit
> complet du code (juin 2026). Modélisation financière ancrée XOF / UEMOA.
> Pour l'état d'avancement du code, voir la section **« État d'implémentation »** en fin de document.

## Context

Wergu Yaram est une plateforme **santé + communauté + collecte de fonds** à vocation chrétienne pour l'Afrique de l'Ouest (Sénégal, devise **XOF**). Stack : React 18 + Vite + TypeScript, Firebase (Firestore, Auth, Functions, Storage), Typesense (recherche), **Bictorys** (mobile money : Wave / Orange Money / MTN / carte).

L'audit du code révèle un produit **fonctionnellement riche mais quasi-non-monétisé** : la seule mécanique de revenu câblée est le **don ponctuel** sur les besoins en équipement (`equipmentNeeds` + `donations` + `createBictorysCharge`/`bictorysWebhook`), et elle est **désactivée par un flag** (`VITE_BICTORYS_ENABLED`). Les champs `price`/`seatsLeft` (events), `featured` (partners), `partner_donor` (organizations) sont des **signaux latents** : les fondateurs ont anticipé une monétisation jamais construite. Il n'existait **aucune** infrastructure `pricing_plans` / `subscriptions` / `transactions` / `commissions` / `revenue_reports` (désormais posée, cf. État d'implémentation).

Ce document livre **(Partie A)** l'analyse stratégique complète, puis **(Partie B)** le plan d'implémentation technique du **scaffold de monétisation** sur Firestore. Modélisation financière **ancrée XOF / réalités UEMOA** (pas de segment diaspora dans ce livrable).

---

# PARTIE A — ANALYSE STRATÉGIQUE

## A.0 — Hypothèses de cadrage (à valider, sinon ne pas surinterpréter les chiffres)

Aucune donnée d'audience réelle n'est dans le code (tout est mock/seed). Les unit economics ci-dessous reposent sur des **hypothèses explicites** de plateforme early-stage en Afrique de l'Ouest :

| Hypothèse | Pessimiste | Réaliste | Optimiste |
|---|---|---|---|
| Visiteurs uniques / mois (M12) | 8 000 | 25 000 | 60 000 |
| Taux visiteur → inscrit | 2 % | 4 % | 7 % |
| Frais agrégateur mobile money (Wave/OM) | ~1,5 % | ~1,2 % | ~1,0 % |
| Don moyen (ARPPU don ponctuel) | 7 500 XOF | 12 000 XOF | 20 000 XOF |
| CAC organique (SEO + communauté + bouche-à-oreille) | quasi-nul | quasi-nul | quasi-nul |
| CAC payant (Meta/Google ads locales) | 2 500 XOF | 1 200 XOF | 600 XOF |

**Règle d'or appliquée** : le premier XOF est le plus dur. La priorité absolue va à ce qui génère du cash **sans nouveau build** (activer Bictorys) avant tout chantier d'infrastructure.

---

## A.1 — Carte des lignes de business

```
┌─────────────────────────────────────────────────────────────┐
│ LIGNE 1 : Crowdfunding équipement santé (Dons)              │
│ Statut : 🟡 En construction (code complet, flag OFF)        │
├─────────────────────────────────────────────────────────────┤
│ Description : campagnes de financement d'équipements pour    │
│   structures de santé ; don via Wave/OM/MTN/carte.          │
│ Audience : grand public sénégalais + donateurs récurrents.  │
│ Valeur : transformer l'empathie en impact traçable          │
│   (raisedAmount / donorsCount / impact[] / updates[]).      │
│ Modèle : don + FRAIS DE PLATEFORME (à ajouter) + dons        │
│   récurrents (à ajouter).                                    │
│ Pricing : frais 0–6 % "pourboire" optionnel donateur ;      │
│   pas de prélèvement sur la structure (positionnement ONG). │
│ Revenu potentiel M12 : 0,9 M – 4,8 M XOF (voir A.3).        │
│ Effort technique : S (activer) → M (frais + récurrence).    │
│ Priorité : 1                                                 │
│ Preuves : functions/src/index.ts (createBictorysCharge,     │
│   bictorysWebhook) ; equipmentNeeds + donations ;           │
│   DonationWidget.tsx ; constants.ts DONATION_AMOUNTS.       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ LIGNE 2 : Annuaire & Pages structures (Directory)           │
│ Statut : 🟢 Active (import Google Places + claim + pages)   │
├─────────────────────────────────────────────────────────────┤
│ Description : annuaire géolocalisé des structures de santé ; │
│   pages revendiquables (modèle FB/LinkedIn) ; partenaires.  │
│ Audience : structures de santé, ONG, partenaires (B2B).     │
│ Valeur : visibilité + crédibilité + leads patients.         │
│ Modèle : freemium page gratuite + ABONNEMENT page vérifiée  │
│   / mise en avant + sponsoring "featured".                  │
│ Pricing : Vérifié 9 900 XOF/mois ; Pro 24 900 XOF/mois.     │
│ Revenu potentiel M12 : 1,2 M – 6 M XOF.                     │
│ Effort technique : M (abonnement + badge + tri featured).   │
│ Priorité : 2                                                 │
│ Preuves : organizations (claimStatus, type partner_donor),  │
│   importPlaces/searchPlaces, partners.featured,             │
│   ClaimStructure.tsx, OrganizationDetail.tsx.               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ LIGNE 3 : Événements & Formations (Billetterie)             │
│ Statut : 🟢 Livré (checkout createTicketCharge + commission;│
│   activation = clés Bictorys)                               │
├─────────────────────────────────────────────────────────────┤
│ Description : talks, ateliers, webinaires (présentiel/en     │
│   ligne/hybride), avec capacité (seatsLeft).                │
│ Audience : grand public, soignants, communautés.            │
│ Valeur : montée en compétence + lien communautaire.         │
│ Modèle : billetterie (one-time) + commission organisateur.  │
│ Pricing : gratuit (acquisition) → 2 500–15 000 XOF/billet ; │
│   commission plateforme 8–10 %.                             │
│ Revenu potentiel M12 : 0,4 M – 2,5 M XOF.                   │
│ Effort technique : M (réutilise le rail Bictorys).          │
│ Priorité : 3                                                 │
│ Preuves : HealthEvent.price/seatsLeft/mode, Evenements.tsx, │
│   EventDetail.tsx.                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ LIGNE 4 : Contenu santé & SEO (Média / Référentiel)         │
│ Statut : 🟢 Active (médicaments DCI, pathologies, articles) │
├─────────────────────────────────────────────────────────────┤
│ Description : référentiel UEMOA (1 300+ DCI), pathologies,   │
│   articles/vidéos vérifiés (TrustMeta).                     │
│ Audience : grand public + soignants (trafic SEO).           │
│ Valeur : autorité, confiance, moteur d'acquisition organique.│
│ Modèle : GRATUIT stratégique → sponsoring de rubrique +     │
│   contenu sponsorisé (natif, étiqueté) + newsletter sponso. │
│ Pricing : rubrique sponsorisée 150 000–400 000 XOF/mois.    │
│ Revenu potentiel M12 : 0 – 2,4 M XOF (dépend de l'audience).│
│ Effort technique : S (champ sponsor + étiquette) ; reste    │
│   commercial, pas technique.                                │
│ Priorité : 4 (catalyseur des autres lignes — ne pas         │
│   monétiser frontalement tôt).                              │
│ Preuves : medications/pathologies/articles, TrustMeta,      │
│   build:seo (sitemap/prerender/OG), partners.contributions. │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ LIGNE 5 : Communauté, Forum & Messagerie (Engagement)       │
│ Statut : 🟢 Active (Firestore réel + Chatwoot)             │
├─────────────────────────────────────────────────────────────┤
│ Description : communautés thématiques, forum Q&A/conseil,   │
│   messagerie 1-1, support.                                  │
│ Audience : patients, aidants, soignants.                    │
│ Valeur : rétention, bouche-à-oreille, réduction du CAC.     │
│ Modèle : NON monétisé directement (moteur du flywheel) →    │
│   à terme membership communauté premium / AMA experts.      │
│ Pricing : (différé) membership 2 000 XOF/mois.              │
│ Revenu potentiel M12 : ~0 (valeur indirecte = -CAC).        │
│ Effort technique : S si activé plus tard.                   │
│ Priorité : 5 (ne pas monétiser — protéger l'engagement).    │
│ Preuves : communities, forumThreads, conversations,         │
│   chatwoot.ts, messaging.ts.                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ LIGNE 6 : Données & B2B santé (Potentielle)                 │
│ Statut : ⚪ Potentielle (infrastructure présente)           │
├─────────────────────────────────────────────────────────────┤
│ Description : insights anonymisés (besoins équipement par    │
│   région, demande, annuaire structuré) pour ONG/bailleurs/  │
│   institutions ; rapports d'impact.                         │
│ Audience : ONG, fondations, ministères, labos (B2B).        │
│ Valeur : data agrégée + canal de distribution ciblé.        │
│ Modèle : licence rapport / dashboard B2B / co-branding.     │
│ Pricing : sur devis (500 000 XOF+ / rapport ou programme).  │
│ Revenu potentiel M12 : 0 – 3 M XOF (1–2 deals).            │
│ Effort technique : L (agrégation + anonymisation + RGPD).   │
│ Priorité : 6 (après traction).                             │
│ Preuves : equipmentNeeds (region/category/urgency),         │
│   organizations annuaire, auditLogs, partners (institution).│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ LIGNE 7 : Espaces partenaires — Kit Digital (PHARE)         │
│ Statut : 🟢 Socle livré (P2) — monétisation à activer       │
├─────────────────────────────────────────────────────────────┤
│ Description : espace en marque blanche multi-tenant pour un  │
│   partenaire (ASSAD…) sur <marque>.werguyaram.org : CMS,    │
│   communauté(s), événements, campagnes SMS/WhatsApp,         │
│   tableau de bord d'impact + Comité de pilotage.            │
│ Audience : associations, ONG, institutions, bailleurs,      │
│   partenaires communautaires & académiques.                 │
│ Valeur : présence digitale clé-en-main + audience + outils  │
│   de prévention + impact mesurable (ESG), sans build propre.│
│ Modèle : HYBRIDE — palier d'abonnement public (PME/assos)   │
│   + « Pacte-Convention » annuel sur devis (institutions).   │
│ Pricing : ~49 000–99 000 XOF/mois (palier) ; convention sur │
│   devis (value-based, bailleurs/institutions).             │
│ Revenu potentiel : phare — déterminé par le nb de partenaires│
│   onboardés (chaque espace = abonnement + services).       │
│ Effort technique : socle livré (tenants, host-routing,      │
│   espace, Comités, campagnes) ; reste facturation + DNS/SSL.│
│ Priorité : haute (différenciateur du deck 2026).           │
│ Preuves : Tenant + tenantHost.ts + TenantContext +          │
│   TenantSpace.tsx ; Committee ; sendCampaign ; entries CMS. │
└─────────────────────────────────────────────────────────────┘
```

## A.2 — Matrice Business Model

| # | Ligne | Modèle | Prix entry | Prix premium | CAC est. (réaliste) | LTV est. | LTV/CAC | Marge brute | Priorité |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Dons équipement | Don + frais opt. + récurrent | Don 500 XOF | Récurrent 5 000 XOF/mois | ~0 (organique) / 1 200 (ads) | 12 000 (1-shot) → 60 000 (récurrent) | 10×–∞ | ~94 %* | 1 |
| 2 | Pages structures | Freemium + abonnement | Gratuit | 9 900 → 24 900 XOF/mois | 8 000 (vente directe) | 178 000 (12 mois @9 900) | ~22× | ~88 % | 2 |
| 3 | Billetterie events | One-time + commission | Gratuit | 2 500–15 000 XOF/billet | ~0 (organique) | variable (8–10 %/billet) | élevé | ~90 % | 3 |
| 4 | Contenu / sponsoring | Sponsoring rubrique | — | 150 000–400 000 XOF/mois | vente B2B | multi-mois | ~95 % | 4 |
| 5 | Communauté | Non monétisé (flywheel) | Gratuit | (différé 2 000 XOF/mois) | — | indirect (−CAC) | — | 5 |
| 6 | Data / B2B | Licence / devis | — | 500 000 XOF+ | vente directe | annuel | ~85 % | 6 |
| 7 | **Espaces partenaires (Kit Digital)** | Hybride : abonnement + convention | ~49 000 XOF/mois | Convention annuelle sur devis | vente B2B / partenariat | annuel (récurrent) | élevé | ~88 % | **haute** |

> **Note formations** : la verticale **Formations / e-learning** (livrée) n'est **pas** une ligne de revenus — elle est positionnée comme **levier d'acquisition & de valeur partenaire** (catégorie académique), au même titre que la communauté.

\* La marge brute des dons n'est "à la plateforme" que si l'on prélève des frais ; sinon le don est reversé (la "marge plateforme" = frais perçus − frais agrégateur). Voir A.3.

## A.3 — Modèles & unit economics par ligne (détail)

### Ligne 1 — Dons (PRIORITÉ 1, cash le plus rapide)
- **Pourquoi ce modèle** : tout est déjà codé ; il ne manque que `VITE_BICTORYS_ENABLED=true` + clés Bictorys. Aucune autre ligne n'a ce niveau de readiness.
- **Monétisation pour la plateforme** (le don lui-même transite vers la structure) :
  1. **Pourboire optionnel donateur** ("Soutenir aussi la plateforme", défaut 0, suggéré 3–6 %). Modèle GoFundMe/Wave — culturellement accepté, zéro friction structure. *C'est le levier #1.*
  2. **Frais de service transparents** affichés (option) — à éviter au début pour ne pas freiner la conversion.
  3. **Dons récurrents mensuels** (la grosse valeur LTV) — nécessite le scaffold `subscriptions` (Partie B).
- **Unit economics (réaliste, M12)** : 25 000 visiteurs/mois × 0,8 % taux de don × 12 000 XOF = ~2,4 M XOF GMV dons/mois ; à 5 % de pourboire moyen + 0 frais structure = **~120 000 XOF/mois** de revenu plateforme, soit ~1,4 M XOF/an. Fourchette annuelle **0,9 M – 4,8 M XOF**.
- **Risque principal** : conversion don trop faible si flag activé sans optimisation du widget. **Fallback** : campagnes "match" (un partenaire double les dons) pour amorcer.
- **Benchmark** : GoFundMe (pourboire optionnel), HelloAsso (modèle pourboire 100 % gratuit pour assos).

### Ligne 2 — Pages structures (PRIORITÉ 2, récurrence)
- **Pourquoi** : `organizations` + claim + `partner_donor` + `featured` existent déjà ; il manque la couche abonnement.
- **Grille XOF** :
  - **Gratuit** : page basique (nom, adresse, coords, horaires). Objectif : remplir l'annuaire (effet réseau).
  - **Vérifié — 9 900 XOF/mois** (9 900, seuil psychologique) : badge vérifié, photos, services détaillés, bouton contact/message, stats de vues.
  - **Pro — 24 900 XOF/mois** : tout Vérifié + mise en avant `featured` sur l'annuaire et la carte, publication d'événements, réponse prioritaire aux avis.
  - **−20 % en annuel** pour la rétention (95 040 XOF/an Vérifié).
- **Unit economics** : 50 structures payantes @ 9 900 = **495 000 XOF/mois** = ~5,9 M XOF/an (haut de fourchette). LTV (churn 5 %/mois ⇒ vie ~20 mois) ≈ 178 000 XOF ; CAC vente directe ~8 000 XOF ⇒ **LTV/CAC ≈ 22×**.
- **Risque** : faible volonté de payer des petites structures. **Fallback** : sponsoring par ONG/labo qui "offre" la page Pro à N structures (B2B).

### Ligne 3 — Billetterie (PRIORITÉ 3)
- **Pourquoi** : `HealthEvent.price`/`seatsLeft` prêts ; réutilise intégralement le rail Bictorys.
- **Modèle** : gratuit pour l'acquisition ; payant 2 500–15 000 XOF ; **commission plateforme 8–10 %** + frais agrégateur répercutés à l'acheteur.
- **Unit economics** : 1 event payant/mois × 40 billets × 5 000 XOF × 9 % = ~18 000 XOF/mois (faible mais marge ~90 %, coût marginal ~nul).
- **Risque** : peu d'organisateurs payants tôt. **Fallback** : rester gratuit + capter les leads/inscrits (acquisition pour Lignes 1/2).

### Ligne 4 — Contenu/sponsoring (PRIORITÉ 4, catalyseur)
- **Le gratuit est la stratégie** : le référentiel DCI/pathologies est le **moteur SEO** qui alimente toutes les autres lignes. Ne PAS mettre de paywall.
- **Monétisation indirecte** : rubrique sponsorisée par un partenaire santé (étiquetée, charte éditoriale stricte vu le sujet médical), newsletter sponsorisée.
- **Risque réglementaire** : promotion de médicaments interdite (le référentiel est explicitement *non promotionnel*, nommage DCI — cf. `RegulatoryMeta`). Sponsoring limité à institutions/ONG/prévention, **jamais de marque de médicament**.

### Ligne 5 — Communauté (NE PAS monétiser)
- **Rôle = flywheel**. Sa valeur est de **réduire le CAC** de toutes les autres lignes via rétention et bouche-à-oreille. Monétiser tôt tuerait l'engagement. Membership premium = option M9+ seulement si densité atteinte.

### Ligne 6 — Data/B2B (PRIORITÉ 6, après traction)
- Insights agrégés anonymisés sur les besoins en équipement par région/catégorie/urgence (`equipmentNeeds`) + annuaire structuré = produit vendable aux bailleurs. Nécessite anonymisation + cadre RGPD/loi sénégalaise (CDP). Devis 500 000 XOF+.

### Ligne 7 — Espaces partenaires / Kit Digital (PHARE, récurrence B2B)
- **Pourquoi ce modèle (hybride)** : le marché partenaire est hétérogène. Un **palier d'abonnement public** (~49 000–99 000 XOF/mois) capte les PME, associations et structures qui veulent une présence clé-en-main et auto-onboardable ; une **« Pacte-Convention » annuelle sur devis** (value-based) capte les institutions, ONG et **bailleurs** dont l'achat est négocié et adossé à des objectifs d'impact/ESG. Les deux cohabitent sans cannibalisation.
- **Ce que l'espace inclut** (réutilise le socle livré) : sous-domaine en marque blanche (`<marque>.werguyaram.org`), CMS dédié, communauté(s) par pathologie, événements, **campagnes SMS/WhatsApp consenties**, **tableau de bord d'impact + Comité de pilotage** (indicateurs mesurables, exportables ESG). Les **formations** du partenaire (catégorie académique) y sont publiées **sans surcoût** — elles servent la valeur, pas une ligne de revenus.
- **Monétisation** : abonnement récurrent (rattaché à `subscriptions`/`pricingPlans`, à étendre avec un plan « Espace partenaire ») + prestations de convention (setup, accompagnement, volume de campagnes). Marge ~85–90 % (coût marginal cloud + SMS/WhatsApp + provisioning DNS/SSL).
- **Unit economics (indicatif)** : 10 partenaires au palier ~70 000 XOF/mois = **~700 000 XOF/mois** (~8,4 M XOF/an) de MRR partenaire, **avant** les conventions institutionnelles (devis ponctuels plus élevés). C'est la ligne au plus fort potentiel de récurrence B2B.
- **Risque principal** : complexité multi-tenant (wildcard DNS/SSL, isolation logique, SEO multi-domaine, **gouvernance de marque**). **Mitigation** : onboarding par partenaire (custom domain) avant wildcard ; charte de marque + Comité de pilotage par espace.
- **Benchmark** : modèles « powered-by » / marque blanche SaaS B2B2C ; le deck 2026 (Kit Digital ASSAD) en fait le **différenciateur** de la plateforme.

## A.4 — Synergies, flywheel & funnel

### Matrice de synergies (flux X → Y)
| | Dons | Pages | Events | Contenu | Communauté |
|---|---|---|---|---|---|
| **Dons** | — | donateurs = leads pages | dons financent events | impact = sujets articles | donateurs rejoignent communauté |
| **Pages** | structures lancent des besoins | — | structures organisent events | structures = experts contenu | structures animent communautés |
| **Events** | participants donnent | sponsors deviennent pages | — | replays = contenu | events créent communautés |
| **Contenu** | trafic → dons | SEO → pages vues | promeut events | — | articles → discussions |
| **Communauté** | confiance → dons | recommande structures | remplit events | génère questions/UGC | — |

### Flywheel central
```
Contenu santé vérifié (SEO gratuit)
  → trafic organique qualifié (CAC ≈ 0)
    → inscriptions + communauté engagée
      → confiance (TrustMeta, modération, rôles soignants)
        → dons + pages payantes + billets
          → revenus réinvestis dans le contenu & la modération
            ↺
```
- **Moteur principal** : le **contenu vérifié** (autorité) couplé à la **confiance communautaire**.
- **Accélérateur partenaire (Ligne 7)** : chaque **espace partenaire (Kit Digital)** injecte dans le flywheel ses communautés, son contenu et ses campagnes de prévention → plus d'audience et d'engagement à coût d'acquisition quasi nul ; la **couche d'impact (Comités)** transforme la traçabilité (don → équipement, messages délivrés, dépistages) en **preuve vendable aux bailleurs** (boucle de financement).
- **Goulot actuel** : (a) Bictorys OFF = zéro conversion monétaire ; (b) tout tourne sur du **mock/seed** (pas d'audience réelle).
- **Investissement qui débloque** : activer Bictorys (cash) + finir la migration mock→Firestore (déjà un programme connu) + SEO réel.
- **Effets de réseau** : annuaire (plus de structures → plus utile → plus de structures) ; communauté (direct) ; data (plus de besoins → meilleurs insights B2B).

### Funnel de monétisation utilisateur
1. **Découverte** (SEO médicaments/pathologies, carte) → capter email (inscription).
2. **Activation** : sauvegarde recherche / rejoint communauté / consulte un besoin → moment "aha" = "je peux agir".
3. **1ʳᵉ conversion** : **micro-don 500–1 000 XOF** sur un besoin urgent (friction minimale, Wave 1-tap).
4. **Rétention** : don récurrent mensuel + updates de campagne + newsletter.
5. **Expansion** : devient manager d'une page (structure), achète un billet, passe Pro.
6. **Advocacy** : partage la campagne (don social), parraine, témoigne (réduit CAC global).

## A.5 — Stratégie de croissance & KPIs

**Acquisition (par ROI décroissant)** :
- **Organique** : SEO sur le référentiel DCI/pathologies (intention de recherche santé forte au Sénégal), partages sociaux de campagnes de dons, communautés WhatsApp/église (canal local clé), partenariats ONG/structures.
- **Viral** : partage de campagne (don = acte social partageable), parrainage donateur, badges.
- **Payant (plus tard)** : Meta Ads ciblées Dakar/Thiès sur campagnes urgentes (ROAS à surveiller), Google Ads sur requêtes "où donner / structure santé".

**KPIs de pilotage (liés à une décision, pas vanity)** :
- Traction : inscrits/mois, MAU, DAU/MAU.
- Monétisation : **GMV dons/mois**, **take rate** (pourboire moyen), MRR pages, conversion don (visiteur→donateur), ARPPU.
- Rétention : churn pages mensuel (<5 %), rétention donateurs récurrents par cohorte, repeat-donation rate.
- Viralité : K-factor partage campagne, taux de parrainage.
- Financier : marge par ligne, LTV/CAC pages, payback CAC.

## A.6 — Priorisation, roadmap 12 mois & risques

### Matrice effort/impact
- **PRIORISER (impact élevé / effort faible)** : Ligne 1 (activer dons + pourboire).
- **PLANIFIER (impact moyen / effort faible)** : Ligne 3 (billetterie sur rail existant), Ligne 4 (sponsoring rubrique).
- **INVESTIR (impact élevé / effort élevé)** : Ligne 2 (abonnement pages), dons récurrents.
- **IGNORER pour l'instant** : Ligne 6 (data B2B) jusqu'à traction ; Ligne 5 (ne jamais monétiser frontalement).

### Roadmap
- **M1–M3 — Fondations (cash rapide)** : activer Bictorys (clés + flag), ajouter **pourboire optionnel**, finir migration mock→Firestore des besoins, instrumenter KPIs dons. Poser le scaffold `transactions` (Partie B). **Revenu : 0,1–0,6 M XOF.**
- **M4–M6 — Accélération** : abonnement Pages (Vérifié/Pro) + badge + tri `featured` ; dons récurrents (`subscriptions`). Premiers sponsors rubrique. **Revenu cumulé : 0,8–3 M XOF.**
- **M7–M9 — Expansion** : billetterie events ; cross-sell (donateur→membre, structure→Pro) ; dashboard revenus admin complet. **Revenu cumulé : 2–6 M XOF.**
- **M10–M12 — Optimisation** : optimisation pricing/funnel, automatisation reporting (`revenue_reports`), 1er deal data/B2B. **Revenu cumulé : 3–12 M XOF.**

**Objectif Année 1** : **3 M – 12 M XOF** ; ~50–150 structures payantes ou équivalent ; break-even opérationnel léger atteignable dès que MRR pages couvre l'hébergement Firebase + modération (M6–M9).

### Risques & mitigations (extrait)
- **Réglementaire paiement** : mobile money via agrégateur agréé (Bictorys) = OK ; PCI géré côté Bictorys (checkout hébergé). **Fiscalité** : TVA sénégalaise sur services digitaux (abonnements/commission) — prévoir facturation. **Données** : conformité CDP Sénégal (équivalent RGPD) pour la Ligne 6.
- **Marché** : faible volonté de payer → prioriser modèles à friction nulle (pourboire, freemium) avant abonnements.
- **Exécution** : tout en mock = risque de croire l'audience acquise. Mitigation : finir mock→Firestore + analytics réels avant d'investir en ads.
- **Réputation** (sujet médical/foi) : sponsoring strictement non-promotionnel médicament ; modération renforcée.

## A.7 — Scorecard écosystème

| Dimension | Score /10 | Commentaire |
|---|---|---|
| Diversification des revenus | 7 | 7 lignes ; socle multi-tenant (Kit Digital) livré → relais de revenu B2B récurrent en plus des dons/pages. Reste à activer le paiement. |
| Synergies entre lignes | 8 | Flywheel contenu→confiance→dons/pages très cohérent ; les espaces partenaires l'alimentent. |
| Rétention & récurrence | 5 | Abonnements pages + espaces partenaires (relation récurrente B2B) posés ; récurrence **automatique** (prélèvement) encore à construire. |
| Scalabilité | 8 | Serverless Firebase + contenu = coût marginal quasi-nul ; carte OSM sans coût clé. |
| Défensabilité | 8 | Moat = contenu vérifié UEMOA + annuaire (effet réseau) + confiance + **espaces marque blanche & couche d'impact** (verrou partenaire). |
| Efficacité d'acquisition | 7 | Fort potentiel organique (SEO santé + communautés/églises) ; CAC bas. |
| Marge | 9 | Marges 85–95 % sur toutes les lignes monétisables. |
| Time-to-revenue | 8 | Ligne 1 activable en jours (code prêt) ; socle partenaire déjà livré. |
| **SANTÉ GLOBALE** | **8/10** | Socle élargi (partenaires, impact mesurable, prévention SMS/WhatsApp) ; reste à **activer le paiement** et la **récurrence automatique** pour convertir le potentiel en cash. |

## A.8 — Top 10 actions immédiates (cette semaine)

1. **Activer Bictorys** (clés `BICTORYS_*` dans `functions/.env`, `VITE_BICTORYS_ENABLED=true`) en test puis prod. — Impact : **déblocage de TOUT revenu** — Effort : S.
2. **Ajouter le pourboire optionnel** au `DonationWidget` (champ % suggéré, défaut 0). — Impact : 1ʳᵉ source de revenu plateforme — Effort : S. ✅ *Livré*
3. **Finir migration mock→Firestore des `equipmentNeeds`** réels (vraies campagnes). — Impact : crédibilité + dons réels — Effort : S/M.
4. **Instrumenter les events analytics dons** (`donation_started`, `donation_succeeded`, montant). — Impact : pilotage — Effort : S.
5. **Créer la collection `transactions`** (registre unifié) — base du scaffold (Partie B). — Impact : fondation reporting — Effort : M. ✅ *Livré*
6. **Écrire les Firestore rules** pour `transactions`/`pricingPlans` (lecture admin, écriture Functions). — Impact : sécurité — Effort : S. ✅ *Livré*
7. **Définir 2 plans Pages** (`pricingPlans`: Vérifié 9 900 / Pro 24 900). — Impact : prépare Ligne 2 — Effort : S. ✅ *Livré*
8. **Ajouter une page admin "Revenus"** (GMV, dons, take rate) lisant `transactions`. — Impact : visibilité C-level — Effort : M. ✅ *Livré*
9. **Page "Soutenir Wergu Yaram"** récurrente (don mensuel) — landing simple. — Impact : amorce LTV — Effort : M.
10. **Cadrer la TVA/facturation** (statut juridique, TVA services digitaux SN) avec un comptable local. — Impact : conformité — Effort : S (externe).

---

# PARTIE B — SCAFFOLD DE MONÉTISATION (Plan d'implémentation Phase 5)

Objectif : poser une **architecture transactionnelle unifiée** qui supporte les 7 lignes, en réutilisant les patterns existants (Cloud Functions + Firestore rules + admin CMS schema-driven). On **étend** le rail Bictorys déjà en place plutôt que d'en créer un nouveau.

## B.1 — Ce qui existe vs ce qui manque

**Existe (à réutiliser)** :
- Rail paiement : `functions/src/index.ts` `createBictorysCharge`, `bictorysWebhook` (signature HMAC, idempotence, rate-limit).
- Collection `donations` + crédit transactionnel de `equipmentNeeds.raisedAmount`.
- Modèle de rôles/permissions : `src/lib/permissions.ts`, `firestore.rules`.
- CMS schema-driven admin : `src/admin/content/entries/`, `src/services/admin/contentAdmin.ts`, shell admin + `PermissionGate`.
- Types domaine : `src/types/domain.ts` ; constants : `src/lib/constants.ts`.

**Manque (à construire)** :
- Registre **`transactions`** unifié (toutes lignes), **`pricingPlans`**, **`subscriptions`**, **`commissions`**, **`revenueReports`**.
- Permission `revenue.read` + page admin **Revenus**.
- Pourboire/frais dans le flux de don ; abonnements (récurrence) ; commission billetterie.

## B.2 — Nouveaux types & collections Firestore

Ajoutés à `src/types/domain.ts` (style JSDoc existant) :

```ts
export type LineOfBusiness = "donations" | "pages" | "events" | "content" | "data";
export type RevenueModel = "one_time" | "subscription" | "commission" | "freemium";
export type BillingPeriod = "monthly" | "yearly" | "one_time";

export interface PricingPlan {
  id: string;
  name: string; slug: string; description?: string;
  lineOfBusiness: LineOfBusiness;
  model: RevenueModel;
  price: number;            // XOF
  currency: "XOF";
  billingPeriod: BillingPeriod;
  features: string[];       // ce qui est inclus
  limits?: Record<string, number>;
  isActive: boolean; sortOrder: number;
  trialDays?: number | null;
}

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";
export interface Subscription {
  id: string; subscriberUid: string;
  orgId?: string;           // si abonnement d'une page structure
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string; currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  provider: "bictorys"; providerSubscriptionId?: string;
  createdAt: string; updatedAt: string;
}

export type TxnType = "donation" | "donation_tip" | "subscription" | "ticket"
  | "commission" | "refund" | "payout" | "sponsorship";
export type TxnStatus = "pending" | "completed" | "failed" | "refunded";
export interface Transaction {
  id: string;
  type: TxnType;
  lineOfBusiness: LineOfBusiness;
  payerUid?: string;
  refId?: string;           // needId / eventId / orgId / planId
  amount: number; currency: "XOF";
  fees: number;             // frais agrégateur
  platformAmount: number;   // ce qui reste à la plateforme (pourboire/commission)
  netAmount: number;        // reversé au bénéficiaire
  status: TxnStatus;
  paymentMethod?: "wave" | "orange_money" | "mtn_money" | "card";
  providerTransactionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Commission {
  id: string; transactionId: string; beneficiaryUid: string; // organizer/seller
  grossAmount: number; commissionRate: number; commissionAmount: number; netAmount: number;
  payoutStatus: "pending" | "processed" | "paid";
  payoutDate?: string; payoutReference?: string;
  createdAt: string;
}

export interface RevenueReport {
  id: string; period: "daily" | "weekly" | "monthly"; date: string;
  lineOfBusiness: LineOfBusiness;
  grossRevenue: number; fees: number; commissions: number; netRevenue: number;
  transactionsCount: number; newCustomers: number; churnedCustomers: number;
  createdAt: string;
}
```

Collections Firestore correspondantes : `pricingPlans`, `subscriptions`, `transactions`, `commissions`, `revenueReports`.

**Principe d'intégration** : `donations` reste tel quel (rétro-compat) ; le webhook écrit **en plus** une `Transaction` (type `donation` + éventuelle `donation_tip`). Ainsi le registre `transactions` devient la source unique pour le reporting, sans casser l'existant.

## B.3 — Services & Cloud Functions

- **Client** : `src/services/billing.ts` (lecture plans, abonnements, transactions) ; `src/services/payments.ts` passe `tipAmount`.
- **Cloud Functions** (`functions/src/index.ts`) :
  - `createBictorysCharge` : accepte `tipAmount` (pourboire) et charge le total (don + pourboire).
  - `bictorysWebhook` : à chaque succès, **transaction Firestore atomique** qui (a) écrit `transactions`, (b) crédite le bénéficiaire (need). À venir : (c) crée/active `subscriptions` si récurrent, (d) crée `commissions` pour billetterie.
  - À venir : `aggregateRevenue` (pubsub schedule) → agrège `transactions` → `revenueReports`.
  - À venir : `chargeDueSubscriptions` planifiée → relance Bictorys pour les abonnements échus.
- **Réutiliser** la signature HMAC, l'idempotence et le rate-limit déjà présents.

## B.4 — Firestore rules & permissions

- `firestore.rules` :
  - `pricingPlans` : lecture publique, écriture `isAdmin()`.
  - `transactions`, `commissions`, `revenueReports` : **écriture Functions uniquement** (comme `donations`), lecture `isAdmin()` ; payeur lit ses propres `transactions`.
  - `subscriptions` : lecture par l'abonné / admin ; écriture Functions.
- `src/lib/permissions.ts` : `"revenue.read"` → `ADMIN` (type `Permission` + `PERMISSION_ROLES`). À garder en sync avec les rules.

## B.5 — Dashboard admin "Revenus"

- Route `/admin/revenue` (gate `RequirePermission permission="revenue.read"`) dans `src/App.tsx` + menu `adminNav.ts`.
- Composant `src/pages/admin/Revenue.tsx` lisant `transactions` via React Query, agrégation client-side (`summarizeTransactions`).
- Vues : GMV, revenu plateforme, **take rate**, transactions, breakdown par ligne, transactions récentes. À enrichir : graphes, MRR pages, LTV, cohortes (quand `revenueReports` sera pré-calculé).

## B.6 — Effort & séquencement

| Bloc | Effort | Dépend de | Statut |
|---|---|---|---|
| Activer Bictorys + pourboire (A.8 #1,2) | S | — | Pourboire ✅ ; activation = ops |
| Collection `transactions` + écriture webhook | M | Bictorys actif | ✅ |
| Rules + permission `revenue.read` | S | transactions | ✅ |
| `pricingPlans` + plans Pages | S | — | ✅ |
| Page admin Revenus (lecture) | M | transactions | ✅ |
| `subscriptions` + `chargeDueSubscriptions` (dons récurrents + Pages) | L | transactions, plans | À venir |
| `commissions` billetterie | M | transactions | À venir |
| `revenueReports` + `aggregateRevenue` planifié | M | transactions | À venir |

Séquence recommandée = ordre du tableau (cash d'abord, récurrence ensuite, reporting en parallèle).

---

## État d'implémentation (scaffold livré)

Le **socle transactionnel** est posé et vérifié (`tsc` app + functions, ESLint 0 erreur, 40/40 tests unitaires, build prod OK). Fichiers :

| Domaine | Fichier | Contenu |
|---|---|---|
| Types | `src/types/domain.ts` | `PricingPlan`, `Subscription`, `Transaction`, `Commission`, `RevenueReport` + unions |
| Permissions | `src/lib/permissions.ts` | `revenue.read` (ADMIN) |
| Règles | `firestore.rules` | `pricingPlans`, `transactions`, `commissions`, `revenueReports`, `subscriptions` |
| Service | `src/services/billing.ts` | lecture plans/abonnements/transactions + `summarizeTransactions` |
| Plans | `src/data/pricingPlans.ts` + `scripts/seed.ts` | Vérifié 9 900 / Pro 24 900 (−20 % annuel) |
| Paiement | `functions/src/index.ts` | pourboire `tipAmount` + écriture `transactions` atomique |
| Client paiement | `src/services/payments.ts` | transmet `tipAmount` |
| UI don | `src/components/equipment/DonationWidget.tsx` | sélecteur de pourboire (0/3/6/10 %) |
| Admin | `src/pages/admin/Revenue.tsx` + route + `adminNav.ts` | dashboard `/admin/revenue` (GMV, take rate, par ligne) |

**Reste à faire** (différé selon B.6) : `subscriptions` récurrents + `chargeDueSubscriptions`, `commissions` billetterie, `aggregateRevenue` → `revenueReports` (le dashboard agrège pour l'instant côté client).

---

## État d'implémentation — Lots croissance partenaire (P1–P5)

Au-delà du scaffold de monétisation, la **stratégie partenaire** (cf. `docs/partner-growth-strategy.md`, ancrée sur le deck 2026 + le modèle ASSAD « Kit Digital ») a été livrée jusqu'à P5 :

| Lot | Contenu | Statut | Impact business model |
|---|---|---|---|
| **P1** | Rôle **`health_pro` vérifié** (annuaire de professionnels de confiance) ; communautés ↔ pathologie + **suggestion au signup** ; **reconnaissance des donateurs** (page « Mes dons & impact ») | ✅ Livré | Renforce confiance (Lignes 1/2/5) + relation donateur |
| **P2** | **Espaces partenaires multi-tenant (Kit Digital)** : `Tenant`, résolution par hôte, espace brandé, CMS | ✅ Socle livré | **Ligne 7 (phare)** — relais de revenu B2B récurrent |
| **P3** | **Campagnes SMS/WhatsApp** ciblées + **consentement (opt-in)**, envoi via Chatwoot | ✅ Livré | Capacité-clé du Kit (valeur partenaire/prévention) |
| **P4** | **Couche d'impact + Comités** (indicateurs mesurables, reporting ESG) sur l'espace partenaire | ✅ Livré | Argument bailleurs/financiers (preuve d'impact) |
| **P5** | **Formations / e-learning** (catégorie académique) | ✅ Livré — **non monétisé** (acquisition/valeur partenaire) | Active la catégorie académique du deck |

**À venir** : **P6** vertical Bien-être & Sport ; **P7** fil d'actualité + notifications push ; **facturation du Kit partenaire** (plan « Espace partenaire » + conventions) ; **récurrence automatique** des abonnements/dons ; **activation des paiements** (ops : clés Bictorys + `VITE_BICTORYS_ENABLED`).

**Ops d'activation du Kit** : provisioning **DNS/SSL** par sous-domaine partenaire (ou wildcard `*.werguyaram.org`), **templates WhatsApp** approuvés par Meta (envoi hors fenêtre 24 h). Détails dans `docs/go-live-checklist.md`.

### Décisions à trancher avant d'aller plus loin
1. **Modèle de frais sur les dons** : la version livrée applique le **pourboire optionnel** (levier recommandé, taux 0/3/6/10 %). Alternatives : frais fixes, ou 100 % gratuit type HelloAsso. Ce choix conditionne le calcul `platformAmount` dans le webhook.
2. **Activation revenus** : nécessite les clés Bictorys + `VITE_BICTORYS_ENABLED=true` (étape ops/déploiement, hors code).

### Vérification end-to-end (à l'activation)
- Émulateurs Firebase : don de test → `Transaction` écrite (`donation`/`donation_tip`), `equipmentNeeds.raisedAmount` crédité, idempotence (rejeu webhook ne double pas). *Note : les tests de règles (`npm run test:rules`) requièrent un JDK 21+.*
- Règles : un `patient_public` ne lit pas les `transactions` d'autrui ni n'écrit `pricingPlans` ; un `admin` accède à `/admin/revenue`.
- `npm run build` (typecheck strict) — OK.
- Smoke test UI : pourboire `DonationWidget` reflété dans `platformAmount` ; `/admin/revenue` affiche GMV et take rate cohérents.

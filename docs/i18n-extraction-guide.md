# i18n — guide d'extraction (FR / EN / Wolof)

Le socle react-i18next est en place. Ce guide décrit comment poursuivre
l'extraction des chaînes, **vague par vague** (chaque vague = un commit isolé et
testable), jusqu'à couverture complète des ~150 fichiers.

## Socle (déjà livré)
- `src/i18n/index.ts` — init, détection langue, `fallbackLng: 'fr'`,
  `returnEmptyString: false` (clés Wolof vides → repli FR). Les ressources sont
  **auto-enregistrées par glob** : déposer `src/i18n/locales/<lng>/<ns>.json`
  suffit, aucune modification de `index.ts`.
- `src/components/layout/LanguageSwitcher.tsx` — sélecteur FR/EN/Wolof (header +
  drawer mobile), persiste dans `localStorage` + profil utilisateur.
- `src/lib/format.ts` — formats (FCFA, dates) suivent la langue active.
- Sync au login : `src/context/AuthContext.tsx` applique `user.language`.
- Namespace de référence livré : **`common`** (actions, états, partage, langue, nav).

## Convention de clés
- Un namespace par domaine/feature : `common`, `auth`, `home`, `search`,
  `facilities`, `medications`, `pathologies`, `articles`, `events`, `community`,
  `needs`, `partners`, `admin`, `account`, `donation`, `errors`, `constants`.
- Clés en `camelCase`, groupées (`actions.save`, `states.errorTitle`).
- Interpolation : `t('needs.daysLeft', { count })` + clés `_plural` si besoin.

## Procédure pour un fichier / une feature
1. Créer (ou compléter) `src/i18n/locales/fr/<ns>.json` avec les chaînes FR
   extraites (source de vérité).
2. Traduire dans `en/<ns>.json` (best-effort).
3. Créer `wo/<ns>.json` avec **les mêmes clés à valeur vide `""`** (TODO Wolof —
   repli FR automatique). Un traducteur les remplira.
4. Dans le composant : `const { t } = useTranslation();` puis remplacer les
   littéraux par `t('<ns>.<clé>')`. Pour les valeurs par défaut de props, calculer
   le défaut dans le corps (`title ?? t(...)`), pas dans la signature (pas de hook
   possible en défaut de paramètre — voir `src/components/ui/ErrorState.tsx`).
5. `npm run build` (détecte les clés manquantes au typage) + tests.

## Avancement (namespaces livrés)
- ✅ `common` — actions, états, partage, pagination, langue, nav, menu utilisateur,
  pied de page, **types de contenu** (`contentTypes`), **menu Explorer**
  (`explore`), **page 404** (`notFound`).
- ✅ `auth` — `Login` + `Register` entièrement traduits (FR/EN, Wolof TODO).
- ✅ `home` — page d'accueil (`Home`).
- ✅ `search` — `SearchResults` (onglets, filtres fiabilité/tri, états, compteur).
- ✅ `filters` — `searchFilters.ts` (titres de facettes, libellés de tri, options
  d'énum AWaRe/urgence/statut/mode/partenaire). `buildFacetGroups(scope, hits,
  selected, t)` reçoit désormais le traducteur ; les libellés sont des clés
  `filters:…`, les valeurs de données (régions/villes) passent inchangées.
- ✅ Composants partagés : `ErrorState`, `EmptyState`, `LoadingState`,
  `Pagination`, `ShareButtons`.
- ✅ Mise en page : `AppHeader`, `AppFooter`, `ExploreMenu` (+ accordéon mobile),
  `NotFound`.
- ✅ Recherche (entrée) : `UniversalSearchBar`, `UniversalSearchHero`
  (`common:searchBar`/`hero`/`shortcuts`/`contentTypesSingular`).
- ✅ `cards` — toutes les cartes : `ResultCard`, `ArticleCard`, `CommunityCard`,
  `EquipmentNeedCard`, `EventPosterCard`, `FacilityCard`, `PartnerCard`
  (CTA, badges, compteurs avec pluriels). Les valeurs de données (titres, villes,
  catégories partenaires) restent inchangées.

Astuce réutilisée : les libellés de type de contenu (Pathologies, Médicaments…)
sont centralisés dans `common:contentTypes.<ContentType>` et résolus par clé
d'enum (voir `ExploreMenu`, onglets de `SearchResults`). Réutiliser ce bloc
partout où un `ContentType` doit être affiché.

- ✅ **Toutes les pages détail publiques** (un namespace par page) :
  `MedicationDetail`, `PathologyDetail`, `FacilityDetail`, `EventDetail`,
  `CommunityDetail`, `EquipmentDetail`, `PartnerDetail`, `ArticleDetail`,
  `FormationDetail`, `OrganizationDetail`. → **Tout le parcours public est i18n.**

## Surfaces restantes (non publiques — priorité moindre)
0. Libellés d'énum encore en dur dans des libs data : `src/lib/formationLabels.ts`
   (format/niveau de formation), `src/lib/constants.ts` (régions, rôles, statuts
   admin). Mêmes patterns que `facilityTaxonomy`/`searchFilters` (résoudre via
   `t()`/helper au rendu).
1. Listing pages publiques restantes (`Structures`, `Communities`, `Evenements`,
   `Partners`, `EquipmentList`, `Formations`, `Soutenir`, `Carte`, `Forum`).
2. `src/lib/searchFilters.ts` est déjà fait ; reste
   `src/lib/constants.ts` (régions, rôles, statuts, libellés
   urgence/besoin/partenaire). Résoudre les `label` via `t()`/helper au rendu.
2. `UniversalSearchHero`/`UniversalSearchBar` (+ `QUICK_SHORTCUTS`), cartes (`*Card`).
3. Pages détail : médicaments, pathologies, établissements, événements,
   communautés, besoins, partenaires, formations.
4. Espace compte/dashboard, puis admin et espaces partenaires.

## Garde-fou (optionnel)
Activer une règle ESLint pour signaler les nouvelles chaînes en dur
(`react/jsx-no-literals` ciblée sur `src/pages` et `src/components`, ou
`eslint-plugin-i18next`) afin d'éviter les régressions pendant la migration.

## Tests
- Les tests forcent la langue FR (`src/test/setup.ts`) pour des formats
  déterministes.
- Vérifier le repli : en Wolof, une clé vide doit afficher le FR (jamais du vide).

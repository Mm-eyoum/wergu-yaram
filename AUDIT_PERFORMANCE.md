# AUDIT PERFORMANCE — Wergu Yaram

> Mesures issues du `npm run build` réel. Les Core Web Vitals sont **estimés** (pas de Lighthouse exécuté dans cet audit).

## 1. Résultat du build (réel)

Build Vite réussi en **~2,1 s**. Principaux artefacts :

| Chunk | Taille | Gzip |
|-------|-------:|-----:|
| `firebase-*.js` | **442,5 kB** | **103,4 kB** |
| `react-*.js` | 164,5 kB | 53,7 kB |
| `index-*.js` (app) | 80,2 kB | 27,8 kB |
| `Register` | 10,1 kB | 3,5 kB |
| `EquipmentDetail` | 8,7 kB | 2,8 kB |
| `Messages` | 8,4 kB | 2,8 kB |
| `Dashboard` | 7,9 kB | 2,6 kB |
| `Home` | 7,7 kB | 2,8 kB |
| … pages | < 8 kB chacune | < 3 kB |
| **Total `dist/assets`** | **~1,0 Mo** | — |

**Lecture** : l'app elle-même est **très légère** (chaque page < 8 kB gzip grâce au lazy-loading). Le poids est **dominé par Firebase** (103 kB gzip) et React (54 kB gzip). C'est typique d'une SPA Firebase ; le découpage manuel (`vite.config.ts`) isole déjà ces deux gros chunks.

---

## 2. Points forts

1. **Code splitting par route** (`App.tsx` : `lazy()` sur les 18 pages) → premier chargement minimal.
2. **Manual chunks** (`vite.config.ts`) : `react` et `firebase` séparés → bon caching long terme (changent rarement).
3. **Bundles applicatifs minuscules** (< 3 kB gzip/page).
4. **Pas d'images lourdes embarquées** : les `cover`/`thumbnail` du mock sont des URLs ; le seul asset local est `logo.png`.
5. **Debounce de la recherche** (`useDebounce`, 180 ms) → évite les calculs à chaque frappe.
6. **`useMemo`** sur les filtres (ex. `Forum.tsx:37`).
7. Police **Inter via @import** dans `index.css` (acceptable ; optimisable, cf. infra).

---

## 3. Problèmes & optimisations

### [PERF-01] Chunk Firebase de 103 kB gzip chargé globalement
- **Gravité** : Moyenne · **Priorité** : P2
- **Fichier** : `src/services/firebase.ts` (init au chargement), `vite.config.ts`
- **Description** : `firebase/app`, `firebase/auth` et `firebase/firestore` sont importés statiquement et initialisés dès le démarrage (`firebase.ts:22-26`), donc le chunk Firebase est dans le **chemin critique** alors que la plupart des pages (contenu mock) n'en ont pas besoin.
- **Impact** : LCP/TTI pénalisés au premier chargement, surtout sur réseau mobile sénégalais (3G/4G variable).
- **Recommandation** : importer Firestore en **dynamic import** (chargé seulement quand une vraie lecture/écriture survient) ; ne charger `auth` que sur les pages auth + au check de session. Le SDK modulaire v10 permet le tree-shaking — vérifier qu'aucun import « compat » ne traîne.
- **Effort** : Moyen

### [PERF-02] Police Inter via `@import` CSS
- **Gravité** : Faible · **Priorité** : P3
- **Fichier** : `src/index.css`
- **Description** : `@import` de Google Fonts bloque le rendu et ajoute un aller-retour réseau ; chargement de 400→800 (5 graisses).
- **Recommandation** : `<link rel="preconnect">` + `<link>` avec `display=swap` dans `index.html`, ou auto-héberger les woff2 ; ne charger que les graisses utilisées.
- **Effort** : Faible

### [PERF-03] Absence de pagination / virtualisation (latent)
- **Gravité** : Faible aujourd'hui (mock court), Moyenne à la migration · **Priorité** : P2
- **Description** : les listes (forum, besoins, recherche) rendent tous les items. Avec de vraies données Firestore, sans pagination/virtualisation, le rendu et la lecture exploseront.
- **Recommandation** : pagination Firestore (`limit`/`startAfter`) + virtualisation (`@tanstack/react-virtual`) pour les longues listes.
- **Effort** : Moyen

### [PERF-04] Pas de cache de données (latent)
- **Gravité** : Moyenne (à la migration) · **Priorité** : P2
- **Description** : sans TanStack Query, chaque navigation re-déclenchera des lectures Firestore (coût + latence + facturation).
- **Recommandation** : TanStack Query (staleTime, cache) — double bénéfice perf + coût Firebase.
- **Effort** : Moyen

### [PERF-05] Re-renders / mémoïsation
- **Gravité** : Faible · **Priorité** : P3
- **Constat** : `AuthContext` mémoïse sa `value` (`useMemo`, `:110`) et ses callbacks (`useCallback`) ✅. Pas de problème de re-render notable détecté. À surveiller dans `AppHeader` (état `menuOpen`/`mobileOpen` local, OK).

---

## 4. Core Web Vitals — estimation

| Métrique | Estimation | Commentaire |
|----------|-----------|-------------|
| **LCP** | ⚠️ Moyen | Chunk Firebase + React (~157 kB gzip) dans le chemin critique ; à améliorer via PERF-01. |
| **INP** | ✅ Bon | App légère, interactions locales, peu de JS par page. |
| **CLS** | ✅ Probablement bon | Layout Tailwind stable ; vérifier images sans dimensions (`cover`/`thumbnail` distants) — risque de décalage si pas de ratio réservé. |

> À **mesurer** avec Lighthouse / PageSpeed sur l'environnement réel pour confirmer.

---

## 5. Recommandations par horizon

**Quick wins**
- Optimiser la police (PERF-02).
- Réserver les ratios d'images (`aspect-ratio`) pour protéger le CLS.
- Mettre à jour Firebase (résout aussi 12 vulnérabilités — cf. SECURITY).

**Moyen terme**
- Dynamic import de Firestore (PERF-01).
- TanStack Query + pagination (PERF-03/04) à brancher avec la migration data.

**Avancé**
- Virtualisation des longues listes.
- Préchargement intelligent des routes probables (`<link rel="prefetch">` / `import()` au survol).
- Mesure continue (budget de perf en CI).

**Score performance : 80/100.** Excellente hygiène de bundle (splitting, lazy-loading, pages minuscules, build rapide) ; la note est limitée par le poids Firebase dans le chemin critique, la police non optimisée et l'absence (à venir) de pagination/cache pour les données réelles.

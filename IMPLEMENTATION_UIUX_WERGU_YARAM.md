# Wergu Yaram — Implémentation UI/UX

Plateforme de santé numérique du Sénégal, **centrée sur une barre de recherche universelle**
(esprit Wave : épuré, rassurant, mobile-first). Cette implémentation reproduit fidèlement les
16 maquettes haute-fidélité fournies dans `Wergu_Yaram_Maquettes_UIUX_Figma_like/`.

## 1. Stack technique

| Élément | Choix |
|---|---|
| Build | **Vite 5** + React 18 + TypeScript |
| Styles | **Tailwind CSS 3** (thème custom basé sur `design_tokens.json`) |
| Routing | **React Router v6** (routes françaises) |
| Backend | **Firebase réel** — Auth (Email/password + Google) + Firestore (projet `werguyaram`) |
| Icônes | lucide-react |
| Police | Inter |

## 2. Démarrer le projet

```bash
npm install
cp .env.example .env.local      # déjà rempli avec la config werguyaram
npm run dev                     # http://localhost:5173
npm run build                   # build de production
npm run typecheck               # tsc --noEmit
npm run lint                    # ESLint
```

**Firebase** : activer dans la console `werguyaram` → Authentication → Email/Password **et**
Google. Les credentials sont dans `.env.local` (gitignoré ; `.env.example` committé).

## 3. Design system

Tokens centralisés dans `tailwind.config.ts` (depuis `03_specs/design_tokens.json`) :

- `brand.green #00A878` · `brand.teal #00B894` · `brand.navy #0B1F49` · `brand.mint #EEFDF8`
- `border.soft #E6EEF2` · `text.primary #0B1F49` · `text.secondary #667085`
- `danger #FF6B6B` · `warning #F6B44B`
- Radii : cartes `rounded-3xl`, boutons `rounded-xl`, search-bar `rounded-full`
- Ombres douces (`shadow-soft` / `shadow-card`), gradient marque `bg-brand-gradient`

Classes utilitaires globales (`src/index.css`) : `.container-page`, `.card-surface`, `.link-muted`.

### Composants réutilisables

```
components/
  ui/        Button + ButtonLink, FormInput, Badge, Card + SectionCard, CategoryPill,
             Tabs, ProgressBar, Avatar, TrustStatsBar, EmptyState, LoadingState + Skeleton,
             SidebarPanel, Logo, Breadcrumb
  search/    UniversalSearchBar (suggestions live + clavier), UniversalSearchHero, FilterSidebar
  layout/    AppHeader, AppFooter, AppShell, AuthLayout, ProtectedRoute, ScrollToTop
  cards/     ResultCard, MedicationCard, PathologyCard, FacilityCard, CommunityCard,
             EquipmentNeedCard, ArticleCard (+vidéo), EventCard, PartnerCard, HealthCategoryCard
  health/    TrustBadge (vérifié / médical / communautaire), MedicalDisclaimer
  equipment/ DonationWidget (montants FCFA + Wave/Mobile Money/carte)
  community/ CommunityComposer, PostCard
  auth/      GoogleButton, RoleSelector, InterestSelector
  dashboard/ ProfileSummaryCard, StatCard
```

## 4. Mapping maquette → page → route

| # Maquette | Page (`src/pages/`) | Route |
|---|---|---|
| 01 home portail | `Home.tsx` | `/` |
| 02 résultats recherche | `SearchResults.tsx` | `/recherche?q=&type=` |
| 03 détail médicament | `MedicationDetail.tsx` | `/medicaments/:slug` |
| 04 détail pathologie | `PathologyDetail.tsx` | `/pathologies/:slug` |
| 05 détail établissement | `FacilityDetail.tsx` | `/etablissements/:slug` |
| 06 communauté | `CommunityDetail.tsx` · `Communities.tsx` | `/communautes/:slug` · `/communautes` |
| 07 besoins équipement | `EquipmentList.tsx` | `/besoins` |
| 08 dashboard | `Dashboard.tsx` | `/dashboard` 🔒 |
| 09 connexion | `Login.tsx` | `/connexion` |
| 10 inscription | `Register.tsx` | `/inscription` |
| 11 article santé | `ArticleDetail.tsx` | `/articles/:slug` |
| 12 forum santé | `Forum.tsx` | `/forum` |
| 13 messages privés | `Messages.tsx` | `/messages` 🔒 |
| 14 détail événement | `EventDetail.tsx` | `/evenements/:id` |
| 15 besoin / donation | `EquipmentDetail.tsx` | `/besoins/:id` |
| 16 partenaires | `Partners.tsx` | `/partenaires` |
| — | `NotFound.tsx` | `*` |

🔒 = route protégée (`ProtectedRoute`, redirige vers `/connexion`).

## 5. Recherche universelle (cœur du produit)

- `UniversalSearchBar` : présent dans le hero d'accueil et **persistant dans le header** sur
  toutes les pages intérieures. Suggestions live groupées, navigation clavier (↑ ↓ ⏎ Échap),
  responsive mobile, route vers `/recherche?q=…`.
- Index fédéré : `src/data/mockSearchIndex.ts` agrège **tous** les contenus en `SearchHit[]`
  (pathologies, médicaments, symptômes, articles, vidéos, établissements, communautés,
  événements, besoins, partenaires).
- Service de recherche : `searchContent(query, scope)` + `searchCounts(query)` dans
  `src/services/content.ts` (scoring simple par pertinence, filtres + tri).

## 6. Données mockées (couche isolée et remplaçable)

Tout le contenu vit dans `src/data/` et n'est consommé qu'à travers la façade
`src/services/content.ts` — **même signature qu'un futur appel Firestore**, donc remplaçable
sans toucher l'UI.

```
data/  mockMedications · mockPathologies · mockArticles · mockFacilities · mockCommunities
       mockEquipmentNeeds · mockEvents · mockPartners · mockForum · mockMessages · mockSearchIndex
```

Types métier centralisés dans `src/types/domain.ts`.

## 7. Authentification & rôles (Firebase réel)

- `src/services/firebase.ts` : init depuis `import.meta.env` (build OK sans secret).
- `src/context/AuthContext.tsx` : `login`, `register`, `loginWithGoogle`, `resetPassword`,
  `logout`, `onAuthStateChanged`.
- `src/services/users.ts` : crée `users/{uid}` `{ displayName, email, role, status, region,
  interests, createdAt }`.
- Rôles : `patient_public` | `healthcare_facility` | `partner` | `partner_donor` | `admin`.
- Statuts : `active` (patient) · `pending` (structure/partenaire/donateur) · `suspended`.
- `firestore.rules` (à la racine) : profil privé, rôle/statut verrouillés après création
  (pas d'auto-promotion), contenu public en lecture seule, messagerie réservée aux
  participants, deny-by-default. **À déployer** : `firebase deploy --only firestore:rules`.

## 8. Responsive & accessibilité

- Mobile-first : header → menu burger + recherche toujours accessible ; grilles multi-colonnes
  qui s'empilent ; messagerie 3 colonnes → 1 colonne.
- WCAG 2.2 AA visé : HTML sémantique, labels de formulaire, `aria-label`, focus visible
  (`:focus-visible` global), contrastes, `alt`, navigation clavier de la search-bar.

## 9. Performance

- Pages **lazy-loaded** (`React.lazy` + `Suspense`) → un chunk par page.
- `manualChunks` (vite.config) : `react` et `firebase` isolés du code applicatif.
- Images en `loading="lazy"`, skeletons (`LoadingState`/`CardSkeleton`), états vides
  (`EmptyState`).

## 10. Vérification

| Commande | Résultat |
|---|---|
| `npm run typecheck` | ✅ 0 erreur |
| `npm run lint` | ✅ 0 erreur (1 warning non bloquant : fast-refresh sur AuthContext) |
| `npm run build` | ✅ build vert, chunks séparés |
| `npm run dev` | ✅ démarre, toutes les routes répondent |

## 11. Prochaines étapes backend (swap mock → Firestore)

1. Activer Email/Password + Google dans la console Firebase `werguyaram`.
2. Déployer `firestore.rules`.
3. Seeder le contenu : `scripts/seed.ts` (optionnel) pousse les mocks dans Firestore
   (`node --env-file=.env.local --import tsx scripts/seed.ts`).
4. Remplacer le corps des fonctions de `src/services/content.ts` par des requêtes Firestore
   (`getDoc`/`getDocs`) — **les composants ne changent pas**.
5. Recherche : passer de l'index mock à Firestore (text search Enterprise) ou à un moteur
   dédié (Algolia/Typesense) synchronisé depuis Firestore, comme évoqué dans le cahier des
   charges.
6. Brancher le forum, la messagerie et les dons sur des collections réelles + un PSP
   (Wave / Mobile Money) pour le paiement.

## 12. Points livrés en UI uniquement (à connecter)

- Recherche (index mock, pas de Firestore).
- Forum, messagerie, feed communautaire (lecture mock ; composer/envoi sans persistance).
- Dons (widget complet, sans appel paiement réel).
- Avis établissements, inscriptions événements (UI).

## 13. Recommandations

- Mutualiser la logique de filtres (SearchResults / EquipmentList / Partners) dans un hook si
  de nouveaux filtres apparaissent.
- Ajouter l'auto-complétion serveur et l'historique de recherche par utilisateur.
- Ajouter une page Admin (modération, validation des structures `pending`, contenus vérifiés).
- Internationalisation progressive (français d'abord, structure prête pour synonymes/alias).
- Tests : ajouter Vitest + Testing Library sur les composants de recherche et le parcours auth.

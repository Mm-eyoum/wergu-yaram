# Refonte du cahier des charges de Wergu Yaram

## Contexte et enjeu

Le cahier des charges actuel décrit déjà **Wergu Yaram** comme une plateforme de santé communautaire pour le Sénégal, articulée autour de contenus éducatifs, d’un réseau social médical, d’un annuaire de structures de santé, d’un recensement des besoins d’équipement, d’un espace partenaires et d’une console d’administration, sur un socle **React/Vite/Firebase**. Il précise aussi que la page d’accueil actuelle joue surtout un rôle de vitrine avec hero, piliers, statistiques et mises en avant éditoriales. La mise à jour demandée ne change donc pas le périmètre produit; elle change la **hiérarchie de l’expérience** pour faire de la **recherche santé** la porte d’entrée principale de tout l’écosystème. fileciteturn0file0

La bonne décision stratégique n’est pas de créer “un site de santé avec une barre de recherche”, mais de transformer Wergu Yaram en **portail santé centré recherche**, où l’utilisateur commence par chercher, puis comprend, puis agit, puis échange. Cette orientation est cohérente avec les références que vous citez: **Mapatho** place la pathologie au centre de l’entrée utilisateur, tandis que **Wave** montre qu’un produit puissant peut se présenter avec une promesse courte, une interface aérée et quelques actions immédiatement compréhensibles. citeturn18view2turn22view0

En une phrase, la refonte doit produire ceci : **sous le capot, Wergu Yaram reste une plateforme complète; à l’écran, Wergu Yaram devient un moteur de recherche santé simple, rassurant et extrêmement lisible**. Cette direction est d’autant plus pertinente que l’OMS rappelle que les solutions de santé numérique doivent partir des besoins réels des pays et des usagers, et non de la seule logique technologique. citeturn14view0

## Benchmark de référence

**Mapatho** est la référence la plus directement transférable. Sa page d’entrée demande d’abord à l’utilisateur de saisir puis sélectionner une **pathologie**, et déploie ensuite autour de cette entrée unique un ensemble cohérent de services : actualités et ressources, forum, messages privés, annuaires de soignants par pathologie, préparation de consultation, gestion des traitements et suivi des symptômes. Autrement dit, la recherche n’est pas un module parmi d’autres; elle est l’axe qui relie information, orientation et communauté. citeturn2view0turn18view2

**Wave** apporte la grammaire de simplicité qu’il manque souvent aux plateformes santé. Sa page d’accueil se résume à une promesse claire, puis à quelques bénéfices formulés en langage direct et concret. Cette approche produit une sensation de maîtrise immédiate : peu de texte, peu de choix simultanés, mais une very forte clarté sur ce que le produit fait et pourquoi il est utile. citeturn22view0

**NHS** est une très bonne référence pour la structure d’un portail santé national : la recherche y coexiste avec un **A–Z santé**, un accès clair aux **services de santé**, et surtout une logique d’orientation quand l’utilisateur n’est pas sûr de ses symptômes ou de ce qu’il doit faire ensuite. Pour Wergu Yaram, c’est un signal fort : le moteur ne doit pas seulement “retrouver des contenus”, il doit aussi **orienter vers la bonne action**. citeturn18view3

**MedlinePlus** et **Ada** apportent la couche de crédibilité éditoriale. MedlinePlus structure son offre autour de **Health Topics**, **Drugs & Supplements**, **Medical Tests**, d’une encyclopédie médicale, de contenus “easy-to-read” et de contenus multilingues; Ada met en avant une **medical library** rédigée par des médecins, formulée simplement et fondée sur la recherche récente. Ensemble, ces deux références montrent que la recherche santé performante repose sur des **verticales éditoriales distinctes**, des contenus lisibles et une confiance visible. citeturn18view4turn18view5

**Vezeeta** et **MYDAWA** sont très utiles pour la lecture africaine et transactionnelle du produit. Vezeeta permet de chercher par **spécialité, médecin ou hôpital**, puis par **zone** et par **mode de soin**; MYDAWA combine **recherche**, **recherches récentes**, **recherches tendance** et **localisation**, ce qui rend l’expérience immédiatement utile et contextualisée. Pour Wergu Yaram, cela veut dire que la recherche centrale doit aussi savoir répondre à des requêtes de type **“où ?”**, **“près de chez moi”**, **“dans ma région”**, **“quoi trouver maintenant ?”** et **“quelle action mener ?”**. citeturn18view1turn18view0

Enfin, l’OMS fournit le garde-fou le plus important. Elle insiste sur le fait qu’une bonne information de santé numérique doit être **compréhensible, localisée et fondée sur des preuves**, et rappelle qu’en contexte d’“infodémie”, la confusion, les messages contradictoires et la désinformation peuvent faire perdre la confiance et nuire aux comportements de santé. Pour Wergu Yaram, cela implique une séparation visuelle nette entre **contenu médical vérifié**, **contenu communautaire** et **contenu transactionnel**. citeturn14view0turn15view2

## Vision produit reformulée

La formulation à intégrer dans le cahier des charges devrait être la suivante :

> **Wergu Yaram est un portail santé communautaire centré recherche pour le Sénégal. Dès la page d’accueil, une barre de recherche centrale constitue le point d’entrée principal vers les médicaments, pathologies, symptômes, structures de santé, contenus éditoriaux, communautés, événements, partenaires et opportunités d’action solidaire. Toutes les fonctionnalités historiques de la plateforme sont conservées, mais elles sont réorganisées autour d’un parcours de recherche, d’orientation, de confiance et d’action simple, mobile-first et accessible.**

Cette reformulation respecte le produit existant : elle ne supprime ni les communautés, ni le forum, ni la messagerie, ni les besoins d’équipement, ni le CMS partenaires, ni l’administration; elle les replace dans une architecture où la **recherche** devient le premier geste utilisateur. C’est d’ailleurs l’un des points forts du socle actuel : Wergu Yaram possède déjà suffisamment de profondeur fonctionnelle pour justifier un vrai **moteur d’accès transversal**. fileciteturn0file0

Concrètement, cela signifie que la home ne doit plus être pensée comme une page “institutionnelle”, mais comme un **portail santé**. La navigation principale cesse d’être le centre de gravité. Le centre de gravité devient la barre de recherche, puis viennent les résultats utiles, puis seulement les rubriques secondaires. Ce schéma reprend le pivot de Mapatho, la lisibilité de Wave et la logique de portail de NHS/MedlinePlus. citeturn18view2turn22view0turn18view3turn18view4

Il faut aussi intégrer la logique de rôles existante dans l’expérience finale. Le cahier actuel prévoit déjà des statuts et permissions distincts pour `patient_public`, `partner`, `partner_donor`, `healthcare_facility` et `admin`. La refonte doit donc faire apparaître une **même recherche centrale**, mais avec une profondeur de résultats, des actions et des CTA adaptés au rôle connecté. Un visiteur anonyme verra les contenus publics; un patient verra aussi les communautés et l’enregistrement personnel; un donateur verra plus vite les besoins à soutenir; une structure verra ses fonctions de gestion en contexte. fileciteturn0file0

## Expérience de recherche centrale

La page d’accueil cible doit être construite autour d’un premier écran extrêmement simple : **logo**, **promesse**, **barre de recherche**, **quelques suggestions**. Le bon modèle n’est pas un hero riche, mais un **hero utilitaire**. L’utilisateur doit comprendre en moins de trois secondes qu’il peut chercher un médicament, une pathologie, un symptôme, une structure, une communauté ou un besoin à soutenir. Mapatho montre la force d’une entrée pathologie; Wave montre qu’une promesse courte et quelques bénéfices suffisent; MYDAWA montre l’intérêt de suggestions récentes et populaires. citeturn18view2turn22view0turn18view0

| Zone de la home | Spécification cible |
|---|---|
| Hero | Un titre très court, une ligne de réassurance, une barre de recherche centrale large et immédiatement focusable |
| Barre de recherche | Placeholder conversationnel du type “Rechercher un médicament, une pathologie, un symptôme, une structure…” |
| Autocomplete | Suggestions groupées par type : Pathologies, Médicaments, Symptômes, Structures, Communautés, Articles, Événements, Besoins |
| Raccourcis | Chips sous la barre : “Diabète”, “Hypertension”, “Paracétamol”, “Asthme”, “Trouver une structure”, “Soutenir un besoin” |
| Sous le pli | Quatre blocs maximum : Explorer par catégorie, Structures proches, Communautés actives, Agir pour une structure |
| Header global | Une version compacte et persistante de la barre de recherche sur toutes les pages, y compris après connexion |

La page de résultats doit fonctionner comme une **recherche fédérée**. Le premier bloc doit être une **réponse rapide** ou une **orientation**, puis viennent les résultats par verticales. Si la requête porte sur une pathologie, la plateforme doit d’abord afficher une fiche synthétique, puis des contenus vérifiés, puis les structures et communautés associées. Si la requête porte sur un médicament, la fiche médicament doit remonter avant les discussions communautaires. Si la requête porte sur un symptôme, la plateforme doit d’abord orienter avec une carte de prudence, des signes d’alerte et les recours disponibles, avant de montrer du contenu secondaire. Cette logique s’aligne sur NHS, MedlinePlus, Ada et les principes de l’OMS sur l’information de santé fondée sur des preuves. citeturn18view3turn18view4turn18view5turn15view2

Le moteur ne doit jamais se présenter comme un diagnostic automatique. Il doit être un **moteur d’orientation**. Pour une requête sensible comme “douleur thoracique”, “saignement grossesse” ou “convulsions enfant”, l’interface doit faire remonter en premier une **alerte d’urgence configurable**, puis un bouton “Que faire maintenant ?”, puis les services concernés, puis les contenus de compréhension. C’est exactement la différence entre un moteur dangereux et un moteur responsable : le premier affiche des résultats; le second affiche d’abord la bonne **priorité d’action**. citeturn18view3turn15view2

Le cœur de l’expérience doit aussi tenir compte des **intentions de recherche**. Wergu Yaram devra gérer au moins cinq familles d’intention :  
**comprendre** (“qu’est-ce que l’asthme ?”), **se soigner / s’informer** (“paracétamol adulte”, “interactions médicament”), **se repérer** (“cardiologue Dakar”, “centre diabète Thiès”), **échanger** (“communauté lupus”, “forum hypertension”), et **agir** (“soutenir un tensiomètre”, “besoin d’échographe”). Cette structuration est cohérente avec le périmètre actuel de la plateforme et avec les patterns observés chez Mapatho, Vezeeta et MYDAWA. fileciteturn0file0 citeturn18view2turn18view1turn18view0

Enfin, la communauté doit être visible, mais jamais confondue avec l’expertise médicale. Les résultats communautaires doivent donc être clairement étiquetés comme **retours d’expérience**, **entraide** ou **discussion**, tandis que les fiches médicales, structures et contenus éditoriaux revus doivent porter des marqueurs de confiance distincts : source, date de mise à jour, niveau de validation, éventuellement professionnel ou comité éditorial. Cette séparation répond à la logique de confiance que l’on retrouve chez Ada et aux recommandations de l’OMS en matière d’infodémie. citeturn18view5turn15view2

## Architecture fonctionnelle et technique

La première règle de la mise à jour est la suivante : **on conserve tout ce qui existe, mais on le réindexe autour de la recherche**. Le cahier actuel couvre déjà les blogs, vidéos, santé, établissements, partenaires, forum, événements, social, messagerie, besoins d’équipement, CMS partenaires et administration. Dans la nouvelle architecture, chacun de ces modules devient une **destination de recherche** avant d’être une rubrique de menu. fileciteturn0file0

```text
Accueil centré recherche
└── Barre centrale
    ├── Pathologies
    ├── Médicaments
    ├── Symptômes
    ├── Structures de santé
    ├── Articles et vidéos
    ├── Communautés et forum
    ├── Événements
    └── Besoins et contributions

Résultats
├── Réponse rapide ou alerte
├── Contenus vérifiés
├── Services locaux
├── Actions utiles
└── Échanges communautaires
```

La deuxième règle est d’ajouter les **objets de contenu qui manquent** pour répondre à votre nouvelle ambition. Le socle actuel possède déjà une base solide pour les pathologies, les structures, les contenus et les communautés, mais il n’est pas décrit comme un référentiel **médicaments** ou **symptômes** à part entière. Il faut donc enrichir le modèle avec au minimum des entités canoniques de type `medications`, `symptoms`, `search_synonyms`, `search_popular_queries`, `review_workflows` et `search_analytics`, tout en réutilisant les collections existantes pour les contenus, structures et communautés. fileciteturn0file0

Il faut également exploiter davantage les actifs déjà présents dans le produit. Le cahier actuel mentionne des coordonnées `lat/lng` pour les établissements, une base de rôles robuste, des pages publiques et protégées, un moteur SEO via injection serveur de meta et un sitemap dynamique, ainsi qu’une console d’administration et un dashboard analytics. La refonte doit s’appuyer dessus pour créer des **pages canoniques** de pathologies, symptômes et médicaments, des résultats par **région**, et un back-office permettant de piloter **synonymes, redirections, résultats promus, marques de confiance et alertes d’urgence**. fileciteturn0file0

Sur le plan technique, il est pertinent de **conserver le stack actuel** et d’ajouter une vraie couche de recherche. Firebase documente désormais une capacité de **text search** dans **Firestore Enterprise**, avec des **text indexes** dédiés; cela ouvre une voie native si vous souhaitez rester au maximum dans l’écosystème Firebase. Si l’ambition produit va plus loin — scoring avancé, boosting métier, synonymes complexes, typo-tolerance plus fine, analytics de pertinence, search merchandising éditorial — il faudra alors connecter un moteur dédié synchronisé depuis Firestore. En tant qu’architecte produit, je recommande de traiter ce choix comme une décision de **niveau stratégique**, pas comme un détail technique. fileciteturn0file0 citeturn21view1

La refonte doit enfin intégrer les chantiers déjà identifiés dans l’audit existant : meilleure isolation de l’administration, durcissement des contrôles de rôle, App Check / protection des fonctions, gestion plus robuste des secrets, montée en maturité accessibilité. La transformation de la home en portail santé ne doit pas être un simple relooking; elle doit servir de moment de **remise à niveau structurelle**. fileciteturn0file0

## Système de design

Le ton visuel à viser est **Wave dans la simplicité**, **Mapatho dans la pertinence santé**, et **Wergu Yaram dans la chaleur de marque**. Cela veut dire : beaucoup d’air, très peu de bruit, une hiérarchie typographique nette, des surfaces calmes, des CTA rares mais clairs, et une sensation de sérénité plutôt que d’empilement fonctionnel. Wave montre très bien qu’un produit puissant paraît simple quand l’interface n’expose qu’une promesse principale et quelques actions structurantes. citeturn22view0

Je recommande de capitaliser fortement sur le **logo existant** et sa perception de soin, de proximité et de confiance. Visuellement, la plateforme devrait rester majoritairement claire, avec un **blanc dominant**, un **bleu de confiance** pour les éléments structurels, un **vert/teal de santé** pour les actions positives et une utilisation très maîtrisée des gradients. L’objectif n’est pas de “faire moderne” par accumulation d’effets, mais de produire quelque chose de **tendance, doux et premium**, tout en restant immédiatement lisible sur mobile.

| Dimension | Direction recommandée |
|---|---|
| Typographie | Une police principale très lisible, une secondaire éventuelle pour le contraste éditorial, jamais plus |
| Mise en page | Grandes marges, grille simple, peu de colonnes, blocs respirants |
| Composants | Barre de recherche pill, cartes rassurantes, badges de confiance, filtres chips |
| Icônes | Ligne claire, médicales sans agressivité, cohérentes avec l’univers santé |
| Microcopie | Français simple, verbes concrets, formulations courtes, pas de jargon inutile |
| Navigation | 4 à 5 items principaux maximum, tout le reste via recherche ou footer enrichi |

L’accessibilité doit passer du statut de chantier secondaire à celui de **norme de conception**. Le W3C rappelle que **WCAG 2.2** est le standard de référence pour rendre un contenu web plus accessible, y compris sur mobile, selon les principes **perceptible, utilisable, compréhensible et robuste**. Pour une plateforme santé, viser **WCAG 2.2 AA** n’est pas un bonus; c’est une exigence de base. Le cahier actuel signale déjà l’accessibilité comme un point de vigilance, il faut donc faire de cette refonte le moment où ce sujet devient structurant. citeturn16view0 fileciteturn0file0

Le langage doit rester **français d’abord**, ce qui est cohérent avec le produit actuel, mais l’expérience doit être pensée pour un futur **multilingue progressif** et pour des contenus **faciles à lire**. MedlinePlus met clairement en avant les contenus “easy-to-read” et “multiple languages”, tandis qu’Ada affiche déjà plusieurs langues, dont le kiswahili. Pour Wergu Yaram, cela justifie un dispositif en deux couches : une rédaction principale très simple en français, puis un système de synonymes, alias et variations orthographiques permettant d’absorber les requêtes populaires, locales et éventuellement multilingues. fileciteturn0file0 citeturn18view4turn18view5

Enfin, la confiance doit être visible partout. Dans un produit de santé, l’utilisateur doit savoir instantanément **qui parle**, **sur quelle base**, **à quelle date**, et **dans quel statut**. Les contenus médicaux vérifiés, les contenus partenaires, les contenus communautaires et les contenus transactionnels doivent donc avoir des styles visuels distincts. C’est ce qui permettra à Wergu Yaram d’être à la fois simple, puissant et responsable. citeturn15view2turn18view5turn18view2

## Feuille de route et critères de réussite

Je recommande une mise en œuvre en **cinq vagues**, afin de préserver la continuité du produit tout en basculant progressivement son centre de gravité. Le fait que Wergu Yaram dispose déjà d’un back-office, d’un périmètre fonctionnel riche, d’un SEO existant et d’un module analytics rend cette trajectoire réaliste sans remettre à plat toute la plateforme. fileciteturn0file0

| Vague | Objectif | Livrables clés |
|---|---|---|
| Cadrage | Repositionner le produit | nouvelle promesse, IA cible, navigation, user flows, règles de confiance |
| UX/UI | Concevoir le portail santé | home centrée recherche, résultats fédérés, fiches type, design system |
| Data & contenus | Préparer le moteur | taxonomie pathologies, référentiel médicaments, symptômes, synonymes, workflows éditoriaux |
| Intégration | Connecter tout l’écosystème | indexation des contenus existants, résultats contextualisés par rôle, recherche persistante sur tout le site |
| Optimisation | Fiabiliser et industrialiser | search analytics, tuning de pertinence, SEO des pages canoniques, accessibilité AA, durcissement sécurité |

Les critères d’acceptation du nouveau cahier des charges devraient être formulés sans ambiguïté. Sur le **premier écran**, la barre de recherche doit être l’élément dominant. Le moteur doit couvrir au minimum **médicaments, pathologies, symptômes, structures, contenus, communautés/forum, événements et besoins/partenaires**. Les résultats doivent être **contextuels**, **fiables**, **segmentés par type**, **adaptés au rôle** et **sécurisés**. Les contenus critiques doivent afficher leurs sources et dates de revue. Les fonctions historiques du produit doivent rester disponibles, mais ne plus dicter l’architecture de surface.

Les indicateurs de succès à suivre sont simples : **taux de recherche avec clic utile**, **temps jusqu’au premier contenu utile**, **taux de zéro résultat**, **part des sessions aboutissant à une structure, une communauté ou une action**, **fraîcheur des fiches santé**, **usage des filtres régionaux**, **accessibilité effective**, et **conversion des requêtes donateurs vers des soutiens réels**. Le redesign sera réussi si Wergu Yaram donne la sensation d’être aussi simple qu’un moteur de recherche grand public, tout en restant aussi riche que la plateforme complète déjà décrite dans votre cahier actuel. fileciteturn0file0
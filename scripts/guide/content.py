# -*- coding: utf-8 -*-
"""
Contenu (français) du Guide d'utilisateur Wergu Yaram.
Séparé du moteur de rendu (build_pptx.py) : ici on ne décrit QUE le contenu.

Chaque slide est un dict. Types reconnus par build_pptx.py :
  - "cover"      : couverture
  - "toc"        : sommaire (items=[...])
  - "section"    : intercalaire de section (num, title, subtitle, role)
  - "feature"    : titre + intro + étapes numérotées + encadrés + capture (img)
  - "fullshot"   : grande capture annotée (img + callouts)
  - "bullets"    : titre + intro + liste de points (pas de capture)
  - "closing"    : slide de fin

Rôles (pour la couleur d'accent) : "public", "pro", "partner", "admin", "brand".
img = nom de fichier dans docs/guide/screenshots/ (sans chemin) ou None.
"""

BRAND = {
    "name": "Wergu Yaram",
    "tagline": "Portail santé du Sénégal",
    "subtitle": "Guide d'utilisateur",
    "version": "Version 1.0",
    "site": "werguyaram.org",
}

SLIDES = []


def add(s):
    SLIDES.append(s)


# ------------------------------------------------------------------ COUVERTURE
add({
    "type": "cover",
    "title": "Guide d'utilisateur",
    "tagline": "Portail santé du Sénégal",
    "subtitle": "Trouver, comprendre, agir pour la santé — pour tous.",
    "footer": "Version 1.0 · werguyaram.org",
})

# --------------------------------------------------------------------- SOMMAIRE
add({
    "type": "toc",
    "title": "Sommaire",
    "items": [
        ("1", "Découvrir Wergu Yaram", "Mission, piliers, à qui s'adresse la plateforme", "brand"),
        ("2", "Démarrage rapide", "Compte, connexion, profil, tableau de bord", "brand"),
        ("3", "Grand public & patients", "Rechercher, s'informer, trouver, échanger, donner", "public"),
        ("4", "Professionnels de santé", "Vérification, établissements, besoins d'équipement", "pro"),
        ("5", "Partenaires", "Espace dédié, contenus, campagnes, personnalisation", "partner"),
        ("6", "Administrateurs", "Back-office, modération, annuaire, revenus, réglages", "admin"),
        ("7", "Sécurité, FAQ & glossaire", "Confidentialité, dépannage, lexique, contacts", "brand"),
    ],
})

# ------------------------------------------------------ 1. DÉCOUVRIR
add({"type": "section", "num": "1", "title": "Découvrir Wergu Yaram",
     "subtitle": "Le portail santé de référence au Sénégal", "role": "brand"})

add({
    "type": "bullets",
    "role": "brand",
    "title": "Qu'est-ce que Wergu Yaram ?",
    "intro": "Wergu Yaram (« la santé du corps ») est un portail web qui rassemble l'information santé "
             "fiable, l'annuaire des structures de soins et une communauté solidaire, accessible à tous "
             "depuis un ordinateur ou un téléphone.",
    "columns": [
        ("Contenus vérifiés", "Fiches médicaments (DCI), pathologies et articles relus par un comité "
                              "éditorial, avec sources et dates de mise à jour."),
        ("Une communauté solidaire", "Communautés thématiques et forum pour poser des questions et "
                                     "trouver du soutien auprès de personnes qui comprennent."),
        ("Agir concrètement", "Soutenir les besoins d'équipement des structures de santé proches de "
                              "vous grâce aux dons en ligne (Wave, Orange Money, MTN, carte)."),
    ],
})

add({
    "type": "bullets",
    "role": "brand",
    "title": "À qui s'adresse la plateforme ?",
    "intro": "Quatre grands profils d'utilisateurs, chacun avec son espace et ses fonctionnalités.",
    "columns": [
        ("Grand public & patients", "Rechercher des informations santé, trouver un établissement, "
                                    "échanger, faire un don, s'inscrire à des événements."),
        ("Professionnels de santé", "Obtenir un badge vérifié, gérer une fiche d'établissement, "
                                    "lancer des besoins d'équipement."),
        ("Partenaires (ONG, institutions)", "Animer un espace de marque dédié, publier des contenus, "
                                            "diffuser des campagnes de prévention."),
        ("Administrateurs", "Gérer les contenus, la modération, l'annuaire, les utilisateurs et le "
                            "suivi des revenus."),
    ],
})

# ------------------------------------------------------ 2. DÉMARRAGE RAPIDE
add({"type": "section", "num": "2", "title": "Démarrage rapide",
     "subtitle": "Créer son compte et prendre ses marques en 5 minutes", "role": "brand"})

add({
    "type": "feature",
    "role": "brand",
    "title": "Créer un compte",
    "intro": "L'inscription est gratuite et ouvre l'accès au tableau de bord, à la messagerie et au suivi de vos dons.",
    "steps": [
        "Cliquez sur « Inscription » en haut à droite, ou rendez-vous sur la page dédiée.",
        "Renseignez votre nom, votre e-mail et un mot de passe sécurisé.",
        "Choisissez votre profil : patient/grand public, professionnel de santé, partenaire ou donateur.",
        "Validez : vous êtes immédiatement connecté et redirigé vers votre tableau de bord.",
    ],
    "tip": "Vous pourrez préciser vos centres d'intérêt santé plus tard pour personnaliser votre fil.",
    "img": "23_inscription.png",
})

add({
    "type": "feature",
    "role": "brand",
    "title": "Se connecter",
    "intro": "Retrouvez votre espace personnel à tout moment avec votre e-mail et votre mot de passe.",
    "steps": [
        "Cliquez sur « Connexion » dans l'en-tête du site.",
        "Saisissez votre e-mail et votre mot de passe.",
        "Cliquez sur « Se connecter ».",
        "En cas d'oubli, utilisez le lien de réinitialisation du mot de passe.",
    ],
    "important": "Ne partagez jamais votre mot de passe. Déconnectez-vous sur un ordinateur partagé.",
    "img": "22_connexion.png",
})

add({
    "type": "feature",
    "role": "brand",
    "title": "Votre tableau de bord",
    "intro": "Le tableau de bord est votre point d'entrée personnel une fois connecté.",
    "steps": [
        "Accédez à « Tableau de bord » depuis le menu de votre compte.",
        "Retrouvez vos favoris, vos centres d'intérêt et vos communautés.",
        "Suivez vos dons et accédez rapidement à vos messages.",
        "Utilisez les raccourcis pour éditer votre profil ou demander une vérification.",
    ],
    "tip": "Le contenu du tableau de bord s'adapte à votre profil et à vos centres d'intérêt.",
    "img": "24_dashboard.png",
})

add({
    "type": "feature",
    "role": "brand",
    "title": "Éditer votre profil",
    "intro": "Complétez votre profil pour une expérience personnalisée et des recommandations pertinentes.",
    "steps": [
        "Ouvrez « Tableau de bord » puis « Modifier le profil ».",
        "Renseignez votre nom affiché, votre langue et votre région.",
        "Sélectionnez vos centres d'intérêt santé (diabète, santé maternelle, etc.).",
        "Activez, si vous le souhaitez, le consentement aux campagnes de prévention SMS/WhatsApp.",
    ],
    "tip": "Enregistrer votre région et votre position améliore les résultats « près de chez vous ».",
    "img": "25_profil.png",
})

# ------------------------------------------------------ 3. GRAND PUBLIC
add({"type": "section", "num": "3", "title": "Grand public & patients",
     "subtitle": "S'informer, trouver, échanger et soutenir", "role": "public"})

add({
    "type": "feature",
    "role": "public",
    "title": "Rechercher sur la plateforme",
    "intro": "La barre de recherche universelle interroge en une fois médicaments, pathologies, articles, "
             "établissements, communautés, événements et besoins.",
    "steps": [
        "Saisissez un mot-clé dans la barre de recherche (ex. « diabète », « paracétamol »).",
        "Parcourez les suggestions instantanées proposées pendant la saisie.",
        "Sur la page de résultats, affinez avec les filtres (type de contenu, région, etc.).",
        "Cliquez sur un résultat pour ouvrir sa fiche détaillée.",
    ],
    "tip": "Combinez les filtres pour cibler précisément (ex. établissements d'une région donnée).",
    "img": "02_recherche.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Consulter une fiche médicament (DCI)",
    "intro": "Les fiches médicaments décrivent le principe actif, les usages et les précautions, dans le "
             "respect de la réglementation UEMOA.",
    "steps": [
        "Recherchez un médicament et ouvrez sa fiche.",
        "Consultez la composition, la posologie et les formes disponibles.",
        "Vérifiez les contre-indications et les effets indésirables.",
        "Repérez la disponibilité par niveau de soins (CSPS, CM, CMA, CH).",
    ],
    "important": "Ces informations sont éducatives et ne remplacent pas l'avis d'un professionnel de santé.",
    "img": "03_medicament.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Comprendre une pathologie",
    "intro": "Chaque fiche maladie explique l'essentiel : comprendre, reconnaître, prévenir et savoir quand consulter.",
    "steps": [
        "Ouvrez une fiche pathologie depuis la recherche.",
        "Lisez les symptômes, les causes et les moyens de prévention.",
        "Consultez les traitements et la rubrique « quand consulter ».",
        "Explorez les médicaments liés et les structures concernées.",
    ],
    "tip": "La FAQ en bas de fiche répond aux questions les plus fréquentes.",
    "img": "04_pathologie.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Lire un article santé",
    "intro": "Articles et vidéos de prévention, rédigés et vérifiés, avec leurs sources.",
    "steps": [
        "Ouvrez un article depuis la recherche ou la page d'accueil.",
        "Repérez le temps de lecture et le sommaire pour naviguer.",
        "Vérifiez l'auteur, les sources et la date de mise à jour.",
        "Parcourez les contenus liés suggérés en fin d'article.",
    ],
    "tip": "Le badge « vérifié » et les sources citées sont des repères de confiance.",
    "img": "05_article.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Trouver un établissement de santé",
    "intro": "L'annuaire recense les structures de soins : adresse, services, spécialités et avis.",
    "steps": [
        "Ouvrez « Établissements » depuis le menu.",
        "Filtrez par région, catégorie (CSPS, CM, CMA, CH) ou secteur (public/privé).",
        "Ouvrez une fiche pour voir coordonnées, services, médecins et avis.",
        "Laissez une note et un avis pour aider les autres usagers.",
    ],
    "tip": "Les besoins d'équipement d'une structure apparaissent directement sur sa fiche.",
    "img": "07_etablissement_detail.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Explorer la carte interactive",
    "intro": "Visualisez les établissements sur une carte et trouvez les structures proches de vous.",
    "steps": [
        "Ouvrez la page « Carte ».",
        "Autorisez la géolocalisation pour centrer la carte sur votre position.",
        "Utilisez les filtres pour n'afficher que certains types de structures.",
        "Cliquez sur un repère pour voir le résumé et accéder à la fiche complète.",
    ],
    "tip": "Les repères se regroupent automatiquement quand vous dézoomez.",
    "img": "09_carte.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Rejoindre une communauté",
    "intro": "Les communautés réunissent des personnes autour d'un thème de santé.",
    "steps": [
        "Ouvrez « Communautés » et choisissez un thème qui vous concerne.",
        "Consultez les règles, les ressources et les publications récentes.",
        "Rejoignez la communauté pour participer.",
        "Publiez, commentez et soutenez les messages des autres membres.",
    ],
    "tip": "Les événements liés à une communauté sont annoncés sur sa page.",
    "img": "11_communaute_detail.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Poser une question au forum",
    "intro": "Le forum permet de poser des questions, partager des conseils et échanger.",
    "steps": [
        "Ouvrez « Forum » et parcourez les fils (questions, discussions, conseils).",
        "Recherchez par mot-clé ou filtrez par étiquette.",
        "Cliquez sur « Poser une question » pour créer un nouveau sujet.",
        "Votez pour les meilleures réponses et repérez les solutions validées.",
    ],
    "important": "Restez courtois et ne partagez pas d'informations personnelles sensibles.",
    "img": "12_forum.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Faire un don pour un équipement",
    "intro": "Soutenez concrètement une structure de santé en finançant un besoin d'équipement précis.",
    "steps": [
        "Ouvrez « Besoins » et choisissez une campagne (objectif, montant collecté, jours restants).",
        "Découvrez l'histoire, le budget détaillé et l'impact attendu.",
        "Cliquez sur « Faire un don » et choisissez un montant (ou un montant libre).",
        "Sélectionnez votre moyen de paiement : Wave, Orange Money, MTN ou carte bancaire.",
    ],
    "tip": "Un pourboire facultatif permet de soutenir le fonctionnement de la plateforme.",
    "img": "14_besoin_detail.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Suivre vos dons",
    "intro": "Retrouvez l'historique de vos dons, vos reçus et l'impact de votre générosité.",
    "steps": [
        "Après un don, vous recevez une confirmation par e-mail.",
        "Ouvrez « Tableau de bord » puis « Mes dons ».",
        "Consultez l'historique et téléchargez vos reçus.",
        "Suivez l'avancement des campagnes que vous avez soutenues.",
    ],
    "tip": "Conservez vos reçus : ils peuvent servir de justificatifs.",
    "img": "26_mes_dons.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Événements & formations",
    "intro": "Participez à des ateliers, webinaires et formations santé près de chez vous ou en ligne.",
    "steps": [
        "Ouvrez « Événements » ou « Formations » et filtrez par thème, format ou ville.",
        "Ouvrez une fiche pour voir le programme, les intervenants et les infos pratiques.",
        "Inscrivez-vous (gratuit) ou achetez un billet si l'événement est payant.",
        "Recevez votre confirmation et, le cas échéant, votre billet par e-mail.",
    ],
    "tip": "Les formations peuvent délivrer une attestation ou un certificat.",
    "img": "16_evenement_detail.png",
})

add({
    "type": "feature",
    "role": "public",
    "title": "Messagerie & support",
    "intro": "Échangez en privé avec d'autres membres et contactez le support en cas de besoin.",
    "steps": [
        "Ouvrez « Messages » pour accéder à vos conversations privées.",
        "Sélectionnez une conversation ou démarrez-en une nouvelle.",
        "Pour une question à l'équipe, utilisez la bulle de support en bas à droite.",
        "Le support est joignable via le web, WhatsApp, e-mail et réseaux sociaux.",
    ],
    "tip": "La bulle de support vous suit sur toutes les pages du site.",
    "img": "28_messages.png",
})

# ------------------------------------------------------ 4. PROFESSIONNELS
add({"type": "section", "num": "4", "title": "Professionnels de santé",
     "subtitle": "Valoriser votre structure et mobiliser des ressources", "role": "pro"})

add({
    "type": "feature",
    "role": "pro",
    "title": "Obtenir le badge « Professionnel vérifié »",
    "intro": "La vérification renforce votre crédibilité et débloque les fonctions professionnelles.",
    "steps": [
        "Ouvrez « Tableau de bord » puis « Vérification professionnelle ».",
        "Renseignez votre numéro d'ordre/licence et vos spécialités.",
        "Indiquez votre structure de rattachement et joignez vos justificatifs.",
        "Soumettez la demande : elle est examinée par un administrateur.",
    ],
    "tip": "Une fois validé, un badge vérifié apparaît sur vos contributions.",
    "img": "27_verification_pro.png",
})

add({
    "type": "feature",
    "role": "pro",
    "title": "Créer ou revendiquer un établissement",
    "intro": "Référencez votre structure ou prenez la main sur une fiche déjà importée.",
    "steps": [
        "Pour une nouvelle structure : « Tableau de bord » → « Créer une page ».",
        "Pour une fiche existante : ouvrez-la puis cliquez sur « Revendiquer ».",
        "Justifiez votre demande de propriété (rôle, justificatifs).",
        "Après validation, la fiche vous est attribuée et devient gérable.",
    ],
    "important": "La revendication est vérifiée par l'équipe avant attribution.",
    "img": "08_revendiquer.png",
})

add({
    "type": "feature",
    "role": "pro",
    "title": "Gérer la fiche de votre établissement",
    "intro": "Tenez à jour les informations vues par le public et améliorez votre visibilité.",
    "steps": [
        "Ouvrez la fiche depuis « Tableau de bord » → vos établissements.",
        "Mettez à jour adresse, horaires, services, spécialités et médecins.",
        "Ajoutez des photos et publiez la fiche.",
        "Ajoutez des co-gestionnaires si plusieurs personnes administrent la structure.",
    ],
    "tip": "Une fiche complète et publiée est mieux référencée dans l'annuaire et la recherche.",
    "img": "30_gerer_etablissement.png",
})

add({
    "type": "feature",
    "role": "pro",
    "title": "Lancer un besoin d'équipement",
    "intro": "Mobilisez des dons pour financer un équipement précis de votre structure.",
    "steps": [
        "Depuis la gestion de votre établissement, créez un nouveau besoin.",
        "Décrivez l'objectif, le budget détaillé et l'impact attendu.",
        "Ajoutez des photos et les documents justificatifs.",
        "Publiez : la campagne apparaît dans « Besoins » et sur votre fiche.",
    ],
    "tip": "Des mises à jour régulières rassurent les donateurs et relancent les dons.",
    "img": "13_besoins.png",
})

add({
    "type": "bullets",
    "role": "pro",
    "title": "Avantages des offres Vérifié & Pro",
    "intro": "Au-delà de la fiche gratuite, des offres renforcent la visibilité et les outils des structures.",
    "columns": [
        ("Badge & confiance", "Badge vérifié et mise en avant de la fiche dans l'annuaire et la recherche."),
        ("Visibilité accrue", "Placement prioritaire et mise en avant (featured) selon l'offre souscrite."),
        ("Outils de gestion", "Gestion enrichie de la fiche, des besoins d'équipement et des co-gestionnaires."),
    ],
})

# ------------------------------------------------------ 5. PARTENAIRES
add({"type": "section", "num": "5", "title": "Partenaires",
     "subtitle": "Un espace de marque pour ONG, institutions et entreprises", "role": "partner"})

add({
    "type": "feature",
    "role": "partner",
    "title": "Votre espace partenaire",
    "intro": "Chaque partenaire dispose d'un espace de marque dédié, regroupant ses contenus et actions.",
    "steps": [
        "Accédez à votre espace public (ex. werguyaram.org/espace/votre-nom).",
        "Présentez votre mission, votre équipe et vos indicateurs d'impact.",
        "Mettez en avant vos communautés, articles, événements et formations.",
        "Partagez l'adresse de votre espace à vos publics.",
    ],
    "tip": "Un domaine personnalisé peut être configuré pour votre espace.",
    "img": "31_espace_partenaire.png",
})

add({
    "type": "feature",
    "role": "partner",
    "title": "Gérer les contenus de l'espace",
    "intro": "Publiez et organisez vos propres contenus depuis la console de gestion.",
    "steps": [
        "Ouvrez « Gestion » → « Contenus » dans votre espace.",
        "Choisissez un type : article, événement, formation ou communauté.",
        "Créez ou modifiez un contenu via l'éditeur dédié.",
        "Publiez : le contenu apparaît dans votre espace et, si pertinent, sur la plateforme.",
    ],
    "tip": "Vos contenus restent rattachés à votre marque (logo et lien sponsor).",
    "img": "33_partenaire_contenus.png",
})

add({
    "type": "feature",
    "role": "partner",
    "title": "Diffuser des campagnes SMS / WhatsApp",
    "intro": "Touchez vos publics avec des campagnes de prévention ciblées, en libre-service.",
    "steps": [
        "Ouvrez « Gestion » → « Campagnes ».",
        "Ciblez votre audience par centre d'intérêt, région ou communauté.",
        "Rédigez votre message et choisissez le canal (SMS ou WhatsApp).",
        "Envoyez et suivez les indicateurs (envois, échecs, désinscriptions).",
    ],
    "important": "Les campagnes respectent les consentements et un quota propre à votre espace.",
    "img": "34_partenaire_campagnes.png",
})

add({
    "type": "feature",
    "role": "partner",
    "title": "Personnaliser & paramétrer",
    "intro": "Adaptez l'apparence de votre espace et gérez ses réglages.",
    "steps": [
        "Ouvrez « Gestion » → « Paramètres ».",
        "Personnalisez la couleur d'accent, la bannière et le logo.",
        "Configurez le domaine et les accès de votre équipe (co-gestionnaires).",
        "Enregistrez : vos changements s'appliquent à votre espace public.",
    ],
    "tip": "Un espace soigné renforce la confiance et l'engagement de vos publics.",
    "img": "35_partenaire_parametres.png",
})

# ------------------------------------------------------ 6. ADMINISTRATEURS
add({"type": "section", "num": "6", "title": "Administrateurs",
     "subtitle": "Piloter la plateforme depuis le back-office", "role": "admin"})

add({
    "type": "feature",
    "role": "admin",
    "title": "Accéder au back-office",
    "intro": "L'espace d'administration centralise la gestion de la plateforme, selon vos droits.",
    "steps": [
        "Connectez-vous avec un compte disposant d'un rôle (éditeur, admin, super-admin).",
        "Ouvrez l'espace « Admin ».",
        "Le tableau de bord présente l'aperçu et les accès rapides.",
        "Les menus visibles dépendent de vos permissions.",
    ],
    "important": "Chaque section est protégée par une permission spécifique.",
    "img": "36_admin_accueil.png",
})

add({
    "type": "feature",
    "role": "admin",
    "title": "Gérer les contenus",
    "intro": "Créez et maintenez la base de connaissances : médicaments, pathologies, articles, événements…",
    "steps": [
        "Ouvrez « Admin » → « Contenus ».",
        "Choisissez un type de contenu et parcourez la liste (recherche, pagination).",
        "Créez un nouvel élément ou modifiez un élément existant.",
        "Renseignez les métadonnées de confiance (sources, date) puis publiez.",
    ],
    "tip": "Les métadonnées de confiance renforcent la crédibilité auprès du public.",
    "img": "37_admin_contenus.png",
})

add({
    "type": "feature",
    "role": "admin",
    "title": "Gérer les utilisateurs & rôles",
    "intro": "Administrez les comptes, attribuez les rôles et gérez les statuts.",
    "steps": [
        "Ouvrez « Admin » → « Utilisateurs ».",
        "Recherchez un compte par e-mail, rôle ou statut.",
        "Attribuez un rôle (éditeur, admin…) — l'attribution super-admin est réservée.",
        "Modifiez le statut d'un compte (actif, en attente, suspendu).",
    ],
    "important": "Les changements de rôle sont sensibles : appliquez le moindre privilège.",
    "img": "38_admin_utilisateurs.png",
})

add({
    "type": "feature",
    "role": "admin",
    "title": "Modérer les contenus",
    "intro": "Traitez les signalements et veillez à la qualité des contributions.",
    "steps": [
        "Ouvrez « Admin » → « Modération ».",
        "Examinez les contenus signalés (publications, commentaires, fiches).",
        "Approuvez, masquez ou supprimez selon les règles de la communauté.",
        "Utilisez les actions groupées pour traiter le spam efficacement.",
    ],
    "tip": "Une modération réactive protège la confiance des utilisateurs.",
    "img": "39_admin_moderation.png",
})

add({
    "type": "feature",
    "role": "admin",
    "title": "Gérer l'annuaire des établissements",
    "intro": "Alimentez et fiabilisez l'annuaire des structures de santé.",
    "steps": [
        "Ouvrez « Admin » → « Annuaire ».",
        "Importez des structures depuis Google Places.",
        "Traitez les demandes de revendication (attribution de propriété).",
        "Appliquez la taxonomie (catégorie, secteur, niveau) et dédoublonnez.",
    ],
    "tip": "Une taxonomie cohérente améliore les filtres et la recherche.",
    "img": "40_admin_annuaire.png",
})

add({
    "type": "feature",
    "role": "admin",
    "title": "Suivre les revenus",
    "intro": "Pilotez la performance financière : dons, abonnements, billetterie et commissions.",
    "steps": [
        "Ouvrez « Admin » → « Revenus ».",
        "Analysez le chiffre d'affaires par ligne (dons, pages, événements, partenaires…).",
        "Suivez les tendances, le revenu net et les frais de plateforme.",
        "Exportez les rapports pour le suivi et la comptabilité.",
    ],
    "tip": "Distinguez revenu brut, frais et revenu net pour un pilotage fiable.",
    "img": "41_admin_revenus.png",
})

add({
    "type": "feature",
    "role": "admin",
    "title": "Campagnes & paramètres",
    "intro": "Diffusez des campagnes à l'échelle de la plateforme et configurez le site.",
    "steps": [
        "« Admin » → « Campagnes » : créez des campagnes SMS/WhatsApp ciblées.",
        "Ciblez par intérêt, région ou communauté, puis suivez la diffusion.",
        "« Admin » → « Paramètres » : configurez identité, e-mails et intégrations.",
        "Gérez aussi redirections SEO, apparence et documents légaux.",
    ],
    "important": "Vérifiez les consentements avant toute campagne de masse.",
    "img": "42_admin_campagnes.png",
})

# ------------------------------------------------------ 7. ANNEXES
add({"type": "section", "num": "7", "title": "Sécurité, FAQ & glossaire",
     "subtitle": "Bonnes pratiques, dépannage et lexique", "role": "brand"})

add({
    "type": "bullets",
    "role": "brand",
    "title": "Sécurité & confidentialité",
    "intro": "Quelques réflexes pour protéger votre compte et vos données.",
    "columns": [
        ("Mot de passe fort", "Utilisez un mot de passe long et unique. Ne le partagez jamais."),
        ("Connexion sûre", "Déconnectez-vous des appareils partagés. Méfiez-vous des liens suspects."),
        ("Vos données", "Vous gérez vos consentements (SMS/WhatsApp) et vos informations depuis le profil."),
        ("Signalement", "Signalez tout contenu inapproprié : la modération intervient rapidement."),
    ],
})

add({
    "type": "bullets",
    "role": "brand",
    "title": "FAQ & dépannage",
    "intro": "Les questions les plus fréquentes et leurs réponses.",
    "columns": [
        ("Je ne parviens pas à me connecter", "Vérifiez l'e-mail saisi, réinitialisez le mot de passe, "
                                              "puis réessayez. Contactez le support si besoin."),
        ("Mon paiement a échoué", "Vérifiez le solde/le plafond, réessayez avec un autre moyen "
                                  "(Wave, Orange Money, MTN, carte). Aucun montant n'est débité en cas d'échec."),
        ("Je ne vois pas l'espace admin", "Les menus dépendent de votre rôle et de vos permissions. "
                                          "Demandez les droits nécessaires à un administrateur."),
        ("Comment contacter le support ?", "Via la bulle de support (en bas à droite), par e-mail "
                                           "ou WhatsApp."),
    ],
})

add({
    "type": "bullets",
    "role": "brand",
    "title": "Glossaire",
    "intro": "Les termes clés de la plateforme.",
    "columns": [
        ("DCI", "Dénomination Commune Internationale : le nom du principe actif d'un médicament."),
        ("Établissement", "Structure de santé : CSPS, Centre médical (CM), CMA ou Centre hospitalier (CH)."),
        ("Besoin d'équipement", "Campagne de financement participatif pour un matériel précis d'une structure."),
        ("Espace partenaire", "Mini-site de marque dédié à une organisation partenaire (multi-tenant)."),
    ],
})

# --------------------------------------------------------------------- CLÔTURE
add({
    "type": "closing",
    "title": "Merci d'utiliser Wergu Yaram",
    "subtitle": "Ensemble, rendons l'information santé accessible à tous.",
    "footer": "Support : bulle d'aide sur le site · werguyaram.org",
})

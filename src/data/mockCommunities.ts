import type { Community } from "@/types/domain";

export const communities: Community[] = [
  {
    slug: "diabete",
    name: "Communauté Diabète",
    topic: "Diabète",
    description:
      "Un espace d'entraide et de partage pour les personnes vivant avec le diabète, leurs proches et les soignants. Échangez vos expériences en toute bienveillance.",
    membersCount: 1280,
    postsCount: 642,
    isPublic: true,
    rules: [
      "Respect et bienveillance envers tous les membres",
      "Pas de conseil médical se substituant à un professionnel",
      "Pas de publicité ni de vente de produits",
      "Protéger la vie privée de chacun",
    ],
    resources: [
      { title: "Guide : équilibrer sa glycémie", type: "Article" },
      { title: "Recettes adaptées au diabète", type: "Article" },
      { title: "Vidéo : utiliser un lecteur de glycémie", type: "Vidéo" },
    ],
    upcomingEvents: ["atelier-diabete"],
    posts: [
      {
        id: "p1",
        author: { name: "Mame Diarra", role: "Membre" },
        timeAgo: "Il y a 2 h",
        content:
          "Comment gérez-vous le ramadan avec le diabète ? Je cherche des conseils pour adapter mon traitement et mon alimentation.",
        tags: ["Conseils", "Alimentation"],
        likes: 24,
        comments: 8,
        shares: 2,
      },
      {
        id: "p2",
        author: { name: "Rokhaya Diène", role: "Membre" },
        timeAgo: "Il y a 5 h",
        content:
          "Mon expérience avec la pratique du sport : la marche quotidienne a vraiment aidé à stabiliser ma glycémie. Courage à tous !",
        tags: ["Témoignage", "Activité physique"],
        likes: 41,
        comments: 12,
        shares: 5,
      },
    ],
  },
  {
    slug: "hypertension",
    name: "Communauté Hypertension",
    topic: "Hypertension",
    description:
      "Partagez conseils, suivis et encouragements pour mieux vivre avec l'hypertension artérielle.",
    membersCount: 870,
    postsCount: 311,
    isPublic: true,
    rules: ["Bienveillance", "Pas de diagnostic en ligne", "Sources fiables encouragées"],
    resources: [{ title: "Mesurer sa tension à la maison", type: "Article" }],
    upcomingEvents: [],
    posts: [
      {
        id: "p1",
        author: { name: "Abdou Kane" },
        timeAgo: "Il y a 1 j",
        content: "Quel tensiomètre conseillez-vous pour un suivi à domicile ?",
        tags: ["Matériel"],
        likes: 9,
        comments: 4,
        shares: 0,
      },
    ],
  },
  {
    slug: "sante-maternelle",
    name: "Santé maternelle",
    topic: "Maternité",
    description: "Accompagnement et entraide autour de la grossesse et des premiers mois de bébé.",
    membersCount: 1540,
    postsCount: 489,
    isPublic: true,
    rules: ["Respect", "Confidentialité", "Pas de publicité"],
    resources: [{ title: "Suivi de grossesse : les étapes clés", type: "Article" }],
    upcomingEvents: [],
    posts: [],
  },
];

export const communityBySlug = (slug: string) => communities.find((c) => c.slug === slug);

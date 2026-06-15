import type { Article } from "@/types/domain";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

export const articles: Article[] = [
  {
    slug: "diabete-type-2",
    title: "Diabète de type 2 : comprendre, prévenir et mieux vivre",
    excerpt:
      "Tout ce qu'il faut savoir sur le diabète de type 2 : facteurs de risque, symptômes, prévention et habitudes de vie pour rester en bonne santé.",
    category: "Maladie chronique",
    cover: img("photo-1505751172876-fa1923c5c528"),
    author: { name: "Dr Awa Ndiaye", role: "Médecin endocrinologue" },
    readingMinutes: 8,
    publishedAt: "2026-05-20",
    type: "article",
    toc: [
      { id: "intro", label: "Qu'est-ce que le diabète de type 2 ?" },
      { id: "risques", label: "Facteurs de risque" },
      { id: "symptomes", label: "Symptômes et dépistage" },
      { id: "prevention", label: "Prévention au quotidien" },
      { id: "vivre", label: "Bien vivre avec son diabète" },
    ],
    body: [
      {
        id: "intro",
        heading: "Qu'est-ce que le diabète de type 2 ?",
        paragraphs: [
          "Le diabète de type 2 est une maladie chronique caractérisée par un taux de sucre trop élevé dans le sang. Il représente plus de 90 % des cas de diabète et progresse fortement au Sénégal.",
          "Contrairement au diabète de type 1, il apparaît souvent à l'âge adulte et est étroitement lié au mode de vie. La bonne nouvelle : il peut largement se prévenir et se contrôler.",
        ],
      },
      {
        id: "risques",
        heading: "Facteurs de risque",
        paragraphs: ["Plusieurs facteurs augmentent le risque de développer un diabète de type 2 :"],
        bullets: [
          "Surpoids et obésité abdominale",
          "Sédentarité et manque d'activité physique",
          "Alimentation riche en sucres et graisses",
          "Antécédents familiaux de diabète",
          "Âge supérieur à 45 ans",
        ],
      },
      {
        id: "symptomes",
        heading: "Symptômes et dépistage",
        paragraphs: [
          "Les symptômes peuvent passer inaperçus pendant des années : soif intense, envie fréquente d'uriner, fatigue, vision floue. Un simple dosage de la glycémie permet le dépistage.",
        ],
      },
      {
        id: "prevention",
        heading: "Prévention au quotidien",
        paragraphs: ["Des gestes simples réduisent fortement le risque :"],
        bullets: [
          "Privilégier les légumes, céréales complètes et légumineuses",
          "Limiter les boissons sucrées",
          "Marcher au moins 30 minutes par jour",
          "Surveiller son poids et sa glycémie",
        ],
      },
      {
        id: "vivre",
        heading: "Bien vivre avec son diabète",
        paragraphs: [
          "Un diabète bien suivi permet une vie normale. L'éducation thérapeutique, le soutien de la communauté et un suivi médical régulier font toute la différence.",
        ],
      },
    ],
    relatedArticles: ["bien-manger-tension"],
    relatedMedications: ["metformine-850mg"],
    sources: [
      { label: "Recommandations diabète", org: "OMS" },
      { label: "Programme national de lutte contre le diabète", org: "Ministère de la Santé" },
    ],
    trust: { verified: true, source: "Comité éditorial Wergu Yaram", updatedAt: "2026-05-20" },
  },
  {
    slug: "bien-manger-tension",
    title: "Bien manger pour contrôler sa tension artérielle",
    excerpt:
      "Le sel, les fruits, l'activité physique : nos conseils concrets pour garder une tension équilibrée au quotidien.",
    category: "Nutrition",
    cover: img("photo-1490645935967-10de6ba17061"),
    author: { name: "Fatou Sarr", role: "Diététicienne nutritionniste" },
    readingMinutes: 6,
    publishedAt: "2026-04-28",
    type: "article",
    toc: [
      { id: "sel", label: "Réduire le sel" },
      { id: "assiette", label: "Composer une bonne assiette" },
    ],
    body: [
      {
        id: "sel",
        heading: "Réduire le sel",
        paragraphs: [
          "Une consommation excessive de sel élève la tension artérielle. Limiter le sel ajouté et les aliments transformés est l'un des gestes les plus efficaces.",
        ],
      },
      {
        id: "assiette",
        heading: "Composer une bonne assiette",
        paragraphs: [
          "Privilégiez les légumes, les fruits, les céréales complètes et le poisson. Réduisez les fritures et les boissons sucrées.",
        ],
      },
    ],
    relatedArticles: ["diabete-type-2"],
    relatedMedications: ["amlodipine-5mg"],
    sources: [{ label: "Nutrition et hypertension", org: "OMS" }],
    trust: { verified: true, source: "Comité éditorial Wergu Yaram", updatedAt: "2026-04-28" },
  },
  {
    slug: "video-prevention-asthme",
    title: "Asthme : reconnaître et gérer une crise (vidéo)",
    excerpt: "Une vidéo pédagogique pour comprendre les signes d'une crise d'asthme et savoir réagir.",
    category: "Vidéo santé",
    cover: img("photo-1576091160550-2173dba999ef"),
    author: { name: "Dr Moussa Ba", role: "Pneumologue" },
    readingMinutes: 4,
    publishedAt: "2026-03-15",
    type: "video",
    videoDurationLabel: "4:12",
    toc: [],
    body: [
      {
        id: "video",
        heading: "À propos de cette vidéo",
        paragraphs: [
          "Cette vidéo explique comment reconnaître les signes d'une crise d'asthme et les bons gestes à adopter en attendant les secours.",
        ],
      },
    ],
    relatedArticles: [],
    relatedMedications: ["salbutamol-100"],
    sources: [{ label: "Prise en charge de l'asthme", org: "OMS" }],
    trust: { verified: true, source: "Comité éditorial Wergu Yaram", updatedAt: "2026-03-15" },
  },
];

export const articleBySlug = (slug: string) => articles.find((a) => a.slug === slug);

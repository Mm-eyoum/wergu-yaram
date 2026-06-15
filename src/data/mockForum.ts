import type { ForumThread } from "@/types/domain";

export const forumThreads: ForumThread[] = [
  {
    id: "f1",
    title: "Quelle alimentation privilégier avec un diabète de type 2 ?",
    excerpt:
      "Je viens d'être diagnostiqué et je cherche des conseils concrets pour adapter mes repas au quotidien.",
    kind: "question",
    author: { name: "Ibrahima Ndoye" },
    timeAgo: "Il y a 3 h",
    tags: ["Diabète", "Nutrition"],
    answers: 12,
    votes: 28,
    views: 340,
    solved: true,
  },
  {
    id: "f2",
    title: "Effets secondaires de l'amlodipine, faut-il s'inquiéter ?",
    excerpt: "Depuis que je prends de l'amlodipine, j'ai les chevilles qui gonflent. Est-ce normal ?",
    kind: "question",
    author: { name: "Aïda Camara" },
    timeAgo: "Il y a 6 h",
    tags: ["Hypertension", "Médicaments"],
    answers: 7,
    votes: 15,
    views: 210,
  },
  {
    id: "f3",
    title: "Astuces pour gérer le stress au travail",
    excerpt: "Partageons nos méthodes pour mieux gérer le stress et préserver notre santé mentale.",
    kind: "discussion",
    author: { name: "Mamadou Lô" },
    timeAgo: "Il y a 1 j",
    tags: ["Santé mentale", "Bien-être"],
    answers: 21,
    votes: 44,
    views: 580,
  },
  {
    id: "f4",
    title: "Vaccin contre la grippe : est-ce recommandé ?",
    excerpt: "À l'approche de la saison, est-il utile de se faire vacciner contre la grippe au Sénégal ?",
    kind: "conseil",
    author: { name: "Dr Sarr", role: "Médecin" },
    timeAgo: "Il y a 2 j",
    tags: ["Prévention", "Vaccination"],
    answers: 9,
    votes: 33,
    views: 415,
  },
];

export const FORUM_TOPICS = [
  { label: "Diabète", count: 128 },
  { label: "Hypertension", count: 96 },
  { label: "Santé mentale", count: 74 },
  { label: "Nutrition", count: 63 },
  { label: "Médicaments", count: 51 },
  { label: "Santé maternelle", count: 47 },
];

export const FORUM_CONTRIBUTORS = [
  { name: "Dr Awa Ndiaye", role: "Endocrinologue", answers: 142 },
  { name: "Fatou Sarr", role: "Diététicienne", answers: 98 },
  { name: "Dr Moussa Ba", role: "Pneumologue", answers: 76 },
  { name: "Mame Diarra", role: "Patiente experte", answers: 54 },
];

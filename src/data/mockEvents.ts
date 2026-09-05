import type { HealthEvent } from "@/types/domain";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

export const events: HealthEvent[] = [
  {
    id: "atelier-diabete",
    title: "Atelier : Bien vivre avec son diabète au quotidien",
    cover: img("photo-1505751172876-fa1923c5c528"),
    summary:
      "Un atelier pratique animé par des professionnels de santé pour apprendre à gérer son diabète au quotidien : alimentation, activité physique et suivi.",
    startAt: "2026-06-24",
    endAt: "2026-06-24",
    timeLabel: "09h00 - 13h00",
    location: "Centre Hospitalier National de Fann",
    city: "Dakar",
    organizer: "Communauté Diabète & CHN Fann",
    mode: "Présentiel",
    price: "Gratuit",
    seatsLeft: 18,
    about:
      "Cet atelier gratuit s'adresse aux personnes vivant avec le diabète et à leurs proches. Animé par une équipe pluridisciplinaire, il aborde l'alimentation, l'activité physique, le suivi de la glycémie et la gestion des situations particulières (ramadan, voyages).",
    audience: ["Personnes diabétiques", "Proches et aidants", "Soignants intéressés"],
    program: [
      { time: "09h00", title: "Accueil et présentation" },
      { time: "09h30", title: "Comprendre le diabète de type 2" },
      { time: "10h30", title: "Alimentation équilibrée — atelier pratique" },
      { time: "11h30", title: "Activité physique adaptée" },
      { time: "12h15", title: "Questions / réponses avec les soignants" },
    ],
    speakers: [
      { name: "Dr Awa Ndiaye", role: "Endocrinologue" },
      { name: "Fatou Sarr", role: "Diététicienne" },
      { name: "Mame Diarra", role: "Patiente experte" },
    ],
    practicalInfo: [
      { label: "Lieu", value: "Salle de conférence, CHN Fann, Dakar" },
      { label: "Accès", value: "Entrée libre, sur inscription" },
      { label: "Contact", value: "atelier@werguyaram.org" },
    ],
    communitySlug: "diabete",
    relatedEvents: ["depistage-hypertension"],
    coords: { lat: 14.6928, lng: -17.4607 },
  },
  {
    id: "depistage-hypertension",
    title: "Journée de dépistage de l'hypertension",
    cover: img("photo-1576091160399-112ba8d25d1d"),
    summary: "Dépistage gratuit de la tension artérielle ouvert à tous.",
    startAt: "2026-07-05",
    endAt: "2026-07-05",
    timeLabel: "08h00 - 14h00",
    location: "Place de l'Indépendance",
    city: "Dakar",
    organizer: "Wergu Yaram & partenaires",
    mode: "Présentiel",
    price: "Gratuit",
    seatsLeft: 120,
    about: "Une journée de sensibilisation et de dépistage gratuit de l'hypertension artérielle.",
    audience: ["Grand public"],
    program: [
      { time: "08h00", title: "Ouverture des stands" },
      { time: "10h00", title: "Conférence : prévenir l'AVC" },
    ],
    speakers: [{ name: "Dr Aminata Fall", role: "Cardiologue" }],
    practicalInfo: [{ label: "Lieu", value: "Place de l'Indépendance, Dakar" }],
    relatedEvents: ["atelier-diabete"],
    coords: { lat: 14.6708, lng: -17.4383 },
  },
];

export const eventById = (id: string) => events.find((e) => e.id === id);

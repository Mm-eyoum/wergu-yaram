import type { Conversation } from "@/types/domain";

export const conversations: Conversation[] = [
  {
    id: "c1",
    name: "Support Wergu Yaram",
    role: "Équipe d'assistance",
    lastMessage: "Bonjour ! Comment pouvons-nous vous aider aujourd'hui ?",
    timeAgo: "10:24",
    unread: 1,
    online: true,
    verified: true,
    messages: [
      { id: "m1", fromMe: false, text: "Bonjour ! Comment pouvons-nous vous aider aujourd'hui ?", time: "10:20" },
      { id: "m2", fromMe: true, text: "Bonjour, je cherche des informations sur le suivi du diabète.", time: "10:22" },
      { id: "m3", fromMe: false, text: "Avec plaisir. Vous pouvez consulter notre fiche dédiée et rejoindre la Communauté Diabète.", time: "10:24" },
    ],
    sharedFiles: [
      { name: "Guide-diabete.pdf", size: "1,2 Mo", type: "PDF" },
      { name: "Ordonnance-type.png", size: "340 Ko", type: "Image" },
    ],
  },
  {
    id: "c2",
    name: "Dr Fatou Diop",
    role: "Endocrinologue",
    lastMessage: "Pensez à bien noter vos glycémies cette semaine.",
    timeAgo: "Hier",
    unread: 0,
    online: false,
    verified: true,
    messages: [
      { id: "m1", fromMe: false, text: "Bonjour, comment se passe votre suivi ?", time: "Hier" },
      { id: "m2", fromMe: true, text: "Plutôt bien, merci docteur.", time: "Hier" },
      { id: "m3", fromMe: false, text: "Pensez à bien noter vos glycémies cette semaine.", time: "Hier" },
    ],
    sharedFiles: [{ name: "Bilan-sanguin.pdf", size: "820 Ko", type: "PDF" }],
  },
  {
    id: "c3",
    name: "Communauté Diabète du Sénégal",
    role: "Groupe communautaire",
    lastMessage: "Rokhaya : Rendez-vous samedi pour l'atelier !",
    timeAgo: "Lun",
    unread: 3,
    online: false,
    messages: [
      { id: "m1", fromMe: false, text: "Rendez-vous samedi pour l'atelier !", time: "Lun" },
    ],
    sharedFiles: [],
  },
  {
    id: "c4",
    name: "Pharmacie Centrale",
    role: "Pharmacie",
    lastMessage: "Votre commande est disponible.",
    timeAgo: "Lun",
    unread: 0,
    online: true,
    messages: [{ id: "m1", fromMe: false, text: "Votre commande est disponible.", time: "Lun" }],
    sharedFiles: [],
  },
];

/**
 * Content registry — one entry per editorial type. Each entry is authored
 * against its real domain interface (type-safe columns + blank record) and
 * declares a form schema consumed by the generic SchemaForm editor.
 */
import { Badge } from "@/components/ui/Badge";
import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { ContentEntry, AnyContentEntry } from "./registry";
import type { FieldDef } from "@/components/admin/fields/SchemaForm";
import type {
  Article,
  Community,
  EquipmentNeed,
  Facility,
  HealthEvent,
  Medication,
  Partner,
  Pathology,
} from "@/types/domain";

// --- Reusable field fragments ---
const PUBLISHED: FieldDef = { name: "published", label: "Publié", type: "boolean" };
const TRUST: FieldDef = {
  name: "trust",
  label: "Confiance",
  type: "object",
  fields: [
    { name: "verified", label: "Vérifié", type: "boolean" },
    { name: "source", label: "Source", type: "text" },
    { name: "updatedAt", label: "Mis à jour le", type: "text", placeholder: "2024-01-01" },
  ],
};

// ============================ MEDICATIONS ============================
const medications: ContentEntry<Medication> = {
  key: "medications",
  label: "Médicaments",
  singular: "Médicament",
  icon: "pill",
  admin: makeContentAdmin<Medication>({ collection: "medications", idField: "slug", titleField: "name", resourceType: "medication" }),
  columns: [
    { key: "family", label: "Famille", render: (m) => m.family },
    { key: "dosage", label: "Dosage", render: (m) => m.dosage },
    { key: "rx", label: "Ordonnance", render: (m) => (m.withoutPrescription ? <Badge tone="green">Libre</Badge> : <Badge tone="neutral">Sur ordonnance</Badge>) },
  ],
  schema: {
    groups: [
      {
        title: "Général",
        fields: [
          { name: "name", label: "Nom", type: "text", required: true },
          { name: "dci", label: "DCI (dénomination commune internationale)", type: "text" },
          { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
          { name: "family", label: "Famille", type: "text" },
          { name: "dosage", label: "Dosage (résumé)", type: "text" },
          { name: "forms", label: "Formes", type: "stringArray", placeholder: "Comprimé, sirop…" },
          { name: "withoutPrescription", label: "Sans ordonnance", type: "boolean" },
          PUBLISHED,
        ],
      },
      {
        title: "Classification & réglementation",
        fields: [
          { name: "pharmacoTherapeuticGroup", label: "Groupe pharmaco-thérapeutique", type: "text" },
          { name: "subgroup", label: "Sous-groupe", type: "text" },
          {
            name: "awareCategory",
            label: "Catégorie AWaRe (antibiotiques)",
            type: "select",
            options: [
              { value: "Access", label: "Access" },
              { value: "Watch", label: "Watch" },
              { value: "Reserve", label: "Reserve" },
            ],
          },
          { name: "essentialMedicine", label: "Médicament essentiel", type: "boolean" },
          {
            name: "productNature",
            label: "Nature",
            type: "select",
            options: [
              { value: "generique", label: "Générique (DCI)" },
              { value: "specialite", label: "Spécialité" },
            ],
          },
          {
            name: "clinicalReviewStatus",
            label: "Statut du contenu clinique",
            type: "select",
            options: [
              { value: "draft", label: "Brouillon (à valider)" },
              { value: "reviewed", label: "Validé" },
            ],
          },
          { name: "clinicalSources", label: "Sources cliniques", type: "stringArray" },
        ],
      },
      {
        title: "Contenu",
        fields: [
          { name: "summary", label: "Résumé", type: "textarea" },
          { name: "usage", label: "Usage", type: "textarea" },
          { name: "posology", label: "Posologie", type: "textarea" },
          { name: "professionalAdvice", label: "Avis du professionnel", type: "textarea" },
        ],
      },
      {
        title: "Détails",
        fields: [
          { name: "contraindications", label: "Contre-indications", type: "stringArray" },
          { name: "sideEffects", label: "Effets indésirables", type: "stringArray" },
          { name: "precautions", label: "Précautions", type: "stringArray" },
          { name: "interactions", label: "Interactions", type: "stringArray" },
          { name: "relatedPathologies", label: "Pathologies liées (slugs)", type: "stringArray" },
        ],
      },
      { title: "Confiance", fields: [TRUST] },
    ],
  },
  empty: () => ({
    slug: "", name: "", dosage: "", family: "", forms: [], summary: "", usage: "", posology: "",
    contraindications: [], sideEffects: [], precautions: [], interactions: [], professionalAdvice: "",
    relatedPathologies: [], withoutPrescription: false, trust: { verified: false }, published: false,
  }),
  publicHref: (m) => `/medicaments/${m.slug}`,
};

// ============================ PATHOLOGIES ============================
const pathologies: ContentEntry<Pathology> = {
  key: "pathologies",
  label: "Pathologies",
  singular: "Pathologie",
  icon: "stethoscope",
  admin: makeContentAdmin<Pathology>({ collection: "pathologies", idField: "slug", titleField: "name", resourceType: "pathology" }),
  columns: [
    { key: "category", label: "Catégorie", render: (p) => p.category },
    { key: "symptoms", label: "Symptômes", render: (p) => p.symptoms?.length ?? 0 },
  ],
  schema: {
    groups: [
      {
        title: "Général",
        fields: [
          { name: "name", label: "Nom", type: "text", required: true },
          { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
          { name: "category", label: "Catégorie", type: "text" },
          PUBLISHED,
        ],
      },
      { title: "Contenu", fields: [
        { name: "summary", label: "Résumé", type: "textarea" },
        { name: "understanding", label: "Comprendre", type: "textarea" },
      ] },
      { title: "Détails", fields: [
        { name: "symptoms", label: "Symptômes", type: "stringArray" },
        { name: "causes", label: "Causes", type: "stringArray" },
        { name: "prevention", label: "Prévention", type: "stringArray" },
        { name: "treatments", label: "Traitements", type: "stringArray" },
        { name: "whenToConsult", label: "Quand consulter", type: "stringArray" },
      ] },
      { title: "FAQ", fields: [
        { name: "faq", label: "Questions fréquentes", type: "repeatable", itemLabel: "une question", fields: [
          { name: "question", label: "Question", type: "text", fullWidth: true },
          { name: "answer", label: "Réponse", type: "textarea", fullWidth: true },
        ] },
      ] },
      { title: "Relations", fields: [
        { name: "commonMedications", label: "Médicaments courants (slugs)", type: "stringArray" },
        { name: "relatedArticles", label: "Articles liés (slugs)", type: "stringArray" },
        { name: "nearbyFacilities", label: "Établissements (slugs)", type: "stringArray" },
        { name: "communitySlug", label: "Communauté (slug)", type: "text" },
      ] },
      { title: "Confiance", fields: [TRUST] },
    ],
  },
  empty: () => ({
    slug: "", name: "", category: "", summary: "", understanding: "", symptoms: [], causes: [],
    prevention: [], treatments: [], whenToConsult: [], faq: [], commonMedications: [], relatedArticles: [],
    nearbyFacilities: [], trust: { verified: false }, published: false,
  }),
  publicHref: (p) => `/pathologies/${p.slug}`,
};

// ============================ ARTICLES ============================
const articles: ContentEntry<Article> = {
  key: "articles",
  label: "Articles",
  singular: "Article",
  icon: "newspaper",
  admin: makeContentAdmin<Article>({ collection: "articles", idField: "slug", titleField: "title", resourceType: "article" }),
  columns: [
    { key: "category", label: "Catégorie", render: (a) => a.category },
    { key: "type", label: "Type", render: (a) => (a.type === "video" ? "Vidéo" : "Article") },
    { key: "reading", label: "Lecture", render: (a) => `${a.readingMinutes} min` },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "title", label: "Titre", type: "text", required: true },
        { name: "slug", label: "Slug", type: "slug", slugFrom: "title", required: true },
        { name: "category", label: "Catégorie", type: "text" },
        { name: "type", label: "Type", type: "select", options: [{ value: "article", label: "Article" }, { value: "video", label: "Vidéo" }] },
        { name: "readingMinutes", label: "Minutes de lecture", type: "number" },
        { name: "publishedAt", label: "Date de publication", type: "text", placeholder: "2024-01-01" },
        { name: "videoDurationLabel", label: "Durée vidéo (si vidéo)", type: "text" },
        PUBLISHED,
      ] },
      { title: "Présentation", fields: [
        { name: "cover", label: "Image de couverture", type: "image" },
        { name: "excerpt", label: "Extrait", type: "textarea" },
        { name: "author", label: "Auteur", type: "object", fields: [
          { name: "name", label: "Nom", type: "text" },
          { name: "role", label: "Rôle", type: "text" },
        ] },
      ] },
      { title: "Sommaire", fields: [
        { name: "toc", label: "Sommaire", type: "repeatable", itemLabel: "une entrée", fields: [
          { name: "id", label: "Ancre (id)", type: "text" },
          { name: "label", label: "Libellé", type: "text" },
        ] },
      ] },
      { title: "Corps", fields: [
        { name: "body", label: "Sections", type: "repeatable", itemLabel: "une section", fields: [
          { name: "id", label: "Ancre (id)", type: "text" },
          { name: "heading", label: "Titre de section", type: "text", fullWidth: true },
          { name: "paragraphs", label: "Paragraphes", type: "stringArray" },
          { name: "bullets", label: "Puces (optionnel)", type: "stringArray" },
        ] },
      ] },
      { title: "Sources & relations", fields: [
        { name: "sources", label: "Sources", type: "repeatable", itemLabel: "une source", fields: [
          { name: "label", label: "Libellé", type: "text" },
          { name: "org", label: "Organisation", type: "text" },
        ] },
        { name: "relatedArticles", label: "Articles liés (slugs)", type: "stringArray" },
        { name: "relatedMedications", label: "Médicaments liés (slugs)", type: "stringArray" },
      ] },
      { title: "Confiance", fields: [TRUST] },
    ],
  },
  empty: () => ({
    slug: "", title: "", excerpt: "", category: "", cover: "", author: { name: "", role: "" }, readingMinutes: 3,
    publishedAt: "", toc: [], body: [], relatedArticles: [], relatedMedications: [], sources: [], type: "article",
    trust: { verified: false }, published: false,
  }),
  publicHref: (a) => `/articles/${a.slug}`,
};

// ============================ FACILITIES ============================
const facilities: ContentEntry<Facility> = {
  key: "facilities",
  label: "Établissements",
  singular: "Établissement",
  icon: "building2",
  admin: makeContentAdmin<Facility>({ collection: "facilities", idField: "slug", titleField: "name", resourceType: "facility" }),
  columns: [
    { key: "type", label: "Type", render: (f) => f.type },
    { key: "region", label: "Région", render: (f) => f.region },
    { key: "city", label: "Ville", render: (f) => f.city },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "name", label: "Nom", type: "text", required: true },
        { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
        { name: "type", label: "Type", type: "text", placeholder: "Hôpital public…" },
        { name: "region", label: "Région", type: "text" },
        { name: "city", label: "Ville", type: "text" },
        { name: "address", label: "Adresse", type: "text" },
        { name: "phone", label: "Téléphone", type: "text" },
        { name: "email", label: "Email", type: "text" },
        { name: "verified", label: "Vérifié", type: "boolean" },
        PUBLISHED,
      ] },
      { title: "Présentation", fields: [
        { name: "cover", label: "Image", type: "image" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "capacity", label: "Capacité", type: "text" },
        { name: "hours", label: "Horaires", type: "text" },
      ] },
      { title: "Offre", fields: [
        { name: "specialties", label: "Spécialités", type: "stringArray" },
        { name: "services", label: "Services", type: "stringArray" },
      ] },
      { title: "Évaluation", fields: [
        { name: "rating", label: "Note", type: "number" },
        { name: "reviewsCount", label: "Nombre d'avis", type: "number" },
      ] },
      { title: "Équipe", fields: [
        { name: "doctors", label: "Médecins", type: "repeatable", itemLabel: "un médecin", fields: [
          { name: "name", label: "Nom", type: "text" },
          { name: "specialty", label: "Spécialité", type: "text" },
        ] },
      ] },
      { title: "Avis", fields: [
        { name: "reviews", label: "Avis", type: "repeatable", itemLabel: "un avis", fields: [
          { name: "author", label: "Auteur", type: "text" },
          { name: "rating", label: "Note", type: "number" },
          { name: "comment", label: "Commentaire", type: "textarea", fullWidth: true },
          { name: "date", label: "Date", type: "text" },
        ] },
      ] },
      { title: "Localisation & besoins", fields: [
        { name: "coords", label: "Coordonnées", type: "coords" },
        { name: "equipmentNeeds", label: "Besoins (ids)", type: "stringArray" },
      ] },
    ],
  },
  empty: () => ({
    slug: "", name: "", type: "", region: "", city: "", address: "", phone: "", email: "", cover: "",
    description: "", specialties: [], services: [], capacity: "", hours: "", rating: 0, reviewsCount: 0,
    doctors: [], reviews: [], coords: { lat: 0, lng: 0 }, equipmentNeeds: [], verified: false, published: false,
  }),
  publicHref: (f) => `/etablissements/${f.slug}`,
};

// ============================ COMMUNITIES ============================
const communities: ContentEntry<Community> = {
  key: "communities",
  label: "Communautés",
  singular: "Communauté",
  icon: "users",
  admin: makeContentAdmin<Community>({ collection: "communities", idField: "slug", titleField: "name", resourceType: "community" }),
  columns: [
    { key: "topic", label: "Thème", render: (c) => c.topic },
    { key: "members", label: "Membres", render: (c) => c.membersCount },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "name", label: "Nom", type: "text", required: true },
        { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
        { name: "topic", label: "Thème", type: "text" },
        { name: "isPublic", label: "Publique", type: "boolean" },
        PUBLISHED,
      ] },
      { title: "Description", fields: [{ name: "description", label: "Description", type: "textarea" }] },
      { title: "Statistiques", fields: [
        { name: "membersCount", label: "Membres", type: "number" },
        { name: "postsCount", label: "Publications", type: "number" },
      ] },
      { title: "Règles & ressources", fields: [
        { name: "rules", label: "Règles", type: "stringArray" },
        { name: "resources", label: "Ressources", type: "repeatable", itemLabel: "une ressource", fields: [
          { name: "title", label: "Titre", type: "text" },
          { name: "type", label: "Type", type: "text" },
        ] },
        { name: "upcomingEvents", label: "Événements à venir (ids)", type: "stringArray" },
      ] },
    ],
  },
  empty: () => ({
    slug: "", name: "", topic: "", description: "", membersCount: 0, postsCount: 0, isPublic: true,
    rules: [], resources: [], upcomingEvents: [], posts: [], published: false,
  }),
  publicHref: (c) => `/communautes/${c.slug}`,
};

// ============================ EQUIPMENT NEEDS ============================
const equipmentNeeds: ContentEntry<EquipmentNeed> = {
  key: "equipmentNeeds",
  label: "Besoins en équipement",
  singular: "Besoin",
  icon: "heartHandshake",
  admin: makeContentAdmin<EquipmentNeed>({ collection: "equipmentNeeds", idField: "id", titleField: "title", resourceType: "equipmentNeed" }),
  columns: [
    { key: "facility", label: "Établissement", render: (n) => n.facilityName },
    { key: "region", label: "Région", render: (n) => n.region },
    { key: "urgency", label: "Urgence", render: (n) => n.urgency },
    { key: "status", label: "Financement", render: (n) => n.status },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "title", label: "Titre", type: "text", required: true },
        { name: "id", label: "Identifiant", type: "slug", slugFrom: "title", required: true },
        { name: "facilitySlug", label: "Établissement (slug)", type: "text" },
        { name: "facilityName", label: "Nom de l'établissement", type: "text" },
        { name: "region", label: "Région", type: "text" },
        { name: "category", label: "Catégorie", type: "text" },
        { name: "urgency", label: "Urgence", type: "select", options: [
          { value: "urgent", label: "Urgent" }, { value: "eleve", label: "Élevé" }, { value: "modere", label: "Modéré" },
        ] },
        { name: "status", label: "Financement", type: "select", options: [
          { value: "en_cours", label: "En cours" }, { value: "finance", label: "Financé" }, { value: "valide", label: "Validé" },
        ] },
        PUBLISHED,
      ] },
      { title: "Présentation", fields: [
        { name: "cover", label: "Image", type: "image" },
        { name: "shortDescription", label: "Description courte", type: "textarea" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "gallery", label: "Galerie (URLs)", type: "stringArray" },
      ] },
      { title: "Financement", fields: [
        { name: "targetAmount", label: "Objectif (FCFA)", type: "number" },
        { name: "raisedAmount", label: "Collecté (FCFA)", type: "number" },
        { name: "donorsCount", label: "Donateurs", type: "number" },
        { name: "daysLeft", label: "Jours restants", type: "number" },
      ] },
      { title: "Détails", fields: [
        { name: "impact", label: "Impact", type: "stringArray" },
        { name: "budget", label: "Budget", type: "repeatable", itemLabel: "une ligne", fields: [
          { name: "label", label: "Libellé", type: "text" },
          { name: "amount", label: "Montant", type: "number" },
        ] },
        { name: "updates", label: "Mises à jour", type: "repeatable", itemLabel: "une mise à jour", fields: [
          { name: "date", label: "Date", type: "text" },
          { name: "title", label: "Titre", type: "text" },
          { name: "text", label: "Texte", type: "textarea", fullWidth: true },
        ] },
        { name: "documents", label: "Documents", type: "repeatable", itemLabel: "un document", fields: [
          { name: "label", label: "Libellé", type: "text" },
          { name: "type", label: "Type", type: "text" },
        ] },
      ] },
    ],
  },
  empty: () => ({
    id: "", title: "", facilitySlug: "", facilityName: "", region: "", category: "", urgency: "modere",
    status: "en_cours", cover: "", shortDescription: "", description: "", targetAmount: 0, raisedAmount: 0,
    donorsCount: 0, daysLeft: 30, impact: [], budget: [], updates: [], documents: [], gallery: [], published: false,
  }),
  publicHref: (n) => `/besoins/${n.id}`,
};

// ============================ EVENTS ============================
const events: ContentEntry<HealthEvent> = {
  key: "events",
  label: "Événements",
  singular: "Événement",
  icon: "calendar",
  admin: makeContentAdmin<HealthEvent>({ collection: "events", idField: "id", titleField: "title", resourceType: "event" }),
  columns: [
    { key: "city", label: "Ville", render: (e) => e.city },
    { key: "mode", label: "Mode", render: (e) => e.mode },
    { key: "start", label: "Début", render: (e) => e.startAt },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "title", label: "Titre", type: "text", required: true },
        { name: "id", label: "Identifiant", type: "slug", slugFrom: "title", required: true },
        { name: "organizer", label: "Organisateur", type: "text" },
        { name: "mode", label: "Mode", type: "select", options: [
          { value: "Présentiel", label: "Présentiel" }, { value: "En ligne", label: "En ligne" }, { value: "Hybride", label: "Hybride" },
        ] },
        { name: "price", label: "Prix", type: "text" },
        { name: "seatsLeft", label: "Places restantes", type: "number" },
        PUBLISHED,
      ] },
      { title: "Dates", fields: [
        { name: "startAt", label: "Début", type: "text", placeholder: "2024-01-01T09:00" },
        { name: "endAt", label: "Fin", type: "text", placeholder: "2024-01-01T17:00" },
        { name: "timeLabel", label: "Libellé horaire", type: "text" },
      ] },
      { title: "Lieu", fields: [
        { name: "location", label: "Lieu", type: "text" },
        { name: "city", label: "Ville", type: "text" },
        { name: "coords", label: "Coordonnées", type: "coords" },
      ] },
      { title: "Présentation", fields: [
        { name: "cover", label: "Image", type: "image" },
        { name: "summary", label: "Résumé", type: "textarea" },
        { name: "about", label: "À propos", type: "textarea" },
        { name: "audience", label: "Public", type: "stringArray" },
      ] },
      { title: "Programme & intervenants", fields: [
        { name: "program", label: "Programme", type: "repeatable", itemLabel: "un créneau", fields: [
          { name: "time", label: "Heure", type: "text" },
          { name: "title", label: "Titre", type: "text" },
        ] },
        { name: "speakers", label: "Intervenants", type: "repeatable", itemLabel: "un intervenant", fields: [
          { name: "name", label: "Nom", type: "text" },
          { name: "role", label: "Rôle", type: "text" },
        ] },
        { name: "practicalInfo", label: "Infos pratiques", type: "repeatable", itemLabel: "une info", fields: [
          { name: "label", label: "Libellé", type: "text" },
          { name: "value", label: "Valeur", type: "text" },
        ] },
      ] },
      { title: "Relations", fields: [
        { name: "communitySlug", label: "Communauté (slug)", type: "text" },
        { name: "relatedEvents", label: "Événements liés (ids)", type: "stringArray" },
      ] },
    ],
  },
  empty: () => ({
    id: "", title: "", cover: "", summary: "", startAt: "", endAt: "", timeLabel: "", location: "", city: "",
    organizer: "", mode: "Présentiel", price: "", seatsLeft: 0, about: "", audience: [], program: [], speakers: [],
    practicalInfo: [], relatedEvents: [], coords: { lat: 0, lng: 0 }, published: false,
  }),
  publicHref: (e) => `/evenements/${e.id}`,
};

// ============================ PARTNERS ============================
const partners: ContentEntry<Partner> = {
  key: "partners",
  label: "Partenaires",
  singular: "Partenaire",
  icon: "handshake",
  admin: makeContentAdmin<Partner>({ collection: "partners", idField: "slug", titleField: "name", resourceType: "partner" }),
  columns: [
    { key: "category", label: "Catégorie", render: (p) => p.categoryLabel },
    { key: "zone", label: "Zone", render: (p) => p.zone },
    { key: "featured", label: "À la une", render: (p) => (p.featured ? <Badge tone="green">Oui</Badge> : "—") },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "name", label: "Nom", type: "text", required: true },
        { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
        { name: "category", label: "Catégorie", type: "select", options: [
          { value: "ong", label: "ONG" }, { value: "institution", label: "Institution" },
          { value: "entreprise", label: "Entreprise" }, { value: "fondation", label: "Fondation" },
          { value: "structure", label: "Structure" },
        ] },
        { name: "categoryLabel", label: "Libellé catégorie", type: "text" },
        { name: "zone", label: "Zone", type: "text" },
        { name: "featured", label: "À la une", type: "boolean" },
        PUBLISHED,
      ] },
      { title: "Présentation", fields: [
        { name: "logo", label: "Logo", type: "image" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "contributionsLabel", label: "Contributions", type: "text" },
        { name: "tags", label: "Tags", type: "stringArray" },
      ] },
    ],
  },
  empty: () => ({
    slug: "", name: "", category: "ong", categoryLabel: "ONG", zone: "", logo: "", description: "",
    contributionsLabel: "", tags: [], published: false,
  }),
  publicHref: () => `/partenaires`,
};

export const CONTENT_ENTRIES = [
  medications, pathologies, articles, facilities, communities, equipmentNeeds, events, partners,
] as unknown as AnyContentEntry[];

export function getContentEntry(key: string | undefined): AnyContentEntry | undefined {
  return CONTENT_ENTRIES.find((e) => e.key === key);
}

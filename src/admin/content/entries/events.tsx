import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { HealthEvent } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED } from "./shared";

export const eventsEntry: ContentEntry<HealthEvent> = {
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
        { name: "price", label: "Prix (libellé affiché)", type: "text" },
        { name: "seatsLeft", label: "Places restantes", type: "number" },
        { name: "category", label: "Thème (collection)", type: "text" },
        { name: "featured", label: "À la une", type: "boolean" },
        PUBLISHED,
      ] },
      { title: "Billetterie", fields: [
        { name: "ticketingEnabled", label: "Activer la billetterie en ligne", type: "boolean" },
        { name: "priceAmount", label: "Prix unitaire (XOF, 0 = gratuit)", type: "number" },
        { name: "commissionRate", label: "Commission plateforme (0–1, défaut 0,09)", type: "number" },
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

import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Facility } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED } from "./shared";

export const facilitiesEntry: ContentEntry<Facility> = {
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

import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { EquipmentNeed } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED } from "./shared";

export const equipmentNeedsEntry: ContentEntry<EquipmentNeed> = {
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

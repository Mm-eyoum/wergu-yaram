import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Formation } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED, TRUST } from "./shared";

export const formationsEntry: ContentEntry<Formation> = {
  key: "formations",
  label: "Formations",
  singular: "Formation",
  icon: "graduation-cap",
  admin: makeContentAdmin<Formation>({ collection: "formations", idField: "slug", titleField: "title", resourceType: "formation" }),
  columns: [
    { key: "category", label: "Thème", render: (f) => f.category ?? "—" },
    { key: "level", label: "Niveau", render: (f) => f.level },
    { key: "format", label: "Format", render: (f) => f.format },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "title", label: "Titre", type: "text", required: true },
        { name: "slug", label: "Slug", type: "slug", slugFrom: "title", required: true },
        { name: "category", label: "Thème", type: "text" },
        { name: "level", label: "Niveau", type: "select", options: [
          { value: "debutant", label: "Débutant" }, { value: "intermediaire", label: "Intermédiaire" }, { value: "avance", label: "Avancé" },
        ] },
        { name: "format", label: "Format", type: "select", options: [
          { value: "e-learning", label: "E-learning" }, { value: "webinaire", label: "Webinaire" },
          { value: "presentiel", label: "Présentiel" }, { value: "hybride", label: "Hybride" },
        ] },
        { name: "durationLabel", label: "Durée (libellé)", type: "text", placeholder: "4 modules · 3 h" },
        { name: "certification", label: "Délivre une certification", type: "boolean" },
        PUBLISHED,
      ] },
      { title: "Présentation", fields: [
        { name: "cover", label: "Image", type: "image" },
        { name: "excerpt", label: "Résumé", type: "textarea" },
        { name: "audience", label: "Public", type: "stringArray" },
        { name: "provider", label: "Organisme de formation", type: "object", fields: [
          { name: "name", label: "Nom", type: "text" },
          { name: "role", label: "Rôle", type: "text" },
        ] },
      ] },
      { title: "Programme", fields: [
        { name: "objectives", label: "Objectifs", type: "stringArray" },
        { name: "modules", label: "Modules", type: "repeatable", itemLabel: "un module", fields: [
          { name: "title", label: "Titre", type: "text", fullWidth: true },
          { name: "summary", label: "Résumé", type: "textarea" },
          { name: "durationLabel", label: "Durée", type: "text" },
        ] },
      ] },
      { title: "Évaluation (quiz → certificat)", fields: [
        { name: "quiz", label: "Questions", type: "repeatable", itemLabel: "une question", fullWidth: true, fields: [
          { name: "question", label: "Question", type: "text", fullWidth: true },
          { name: "options", label: "Réponses possibles", type: "stringArray" },
          { name: "answer", label: "Index de la bonne réponse (0 = la 1ʳᵉ)", type: "number" },
        ] },
      ] },
      { title: "Accès & relations", fields: [
        { name: "enrollUrl", label: "Lien d'inscription / d'accès", type: "text" },
        { name: "relatedEventId", label: "Webinaire lié (id événement)", type: "text" },
      ] },
      { title: "Confiance", fields: [TRUST] },
    ],
  },
  empty: () => ({
    slug: "", title: "", excerpt: "", category: "", level: "debutant", format: "e-learning",
    durationLabel: "", audience: [], modules: [], objectives: [], certification: false,
    published: false, trust: { verified: false },
  }),
  publicHref: (f) => `/formations/${f.slug}`,
};

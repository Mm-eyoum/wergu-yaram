import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Pathology } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED, TRUST } from "./shared";

export const pathologiesEntry: ContentEntry<Pathology> = {
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

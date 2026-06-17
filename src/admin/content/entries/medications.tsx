import { Badge } from "@/components/ui/Badge";
import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Medication } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED, TRUST } from "./shared";

export const medicationsEntry: ContentEntry<Medication> = {
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

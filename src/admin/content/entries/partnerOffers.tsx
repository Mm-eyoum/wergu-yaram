import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { PartnerOffer } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED } from "./shared";

const KIND_LABELS: Record<PartnerOffer["kind"], string> = {
  service: "Offre de service",
  produit: "Produit / solution",
  appel: "Appel à projets",
};

export const partnerOffersEntry: ContentEntry<PartnerOffer> = {
  key: "partnerOffers",
  label: "Offres & appels à projets",
  singular: "Offre",
  description: "Prestations, produits/solutions ou appels à projets affichés sur l'espace partenaire.",
  icon: "briefcase",
  admin: makeContentAdmin<PartnerOffer>({ collection: "partnerOffers", idField: "slug", titleField: "title", resourceType: "partnerOffer" }),
  columns: [
    { key: "title", label: "Titre", render: (o) => o.title },
    { key: "kind", label: "Type", render: (o) => KIND_LABELS[o.kind] ?? o.kind },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "kind", label: "Type", type: "select", required: true, options: [
          { value: "service", label: "Offre de service" },
          { value: "produit", label: "Produit / solution" },
          { value: "appel", label: "Appel à projets / financement" },
        ] },
        { name: "title", label: "Titre", type: "text", required: true },
        { name: "slug", label: "Identifiant (slug)", type: "slug", slugFrom: "title", required: true },
        { name: "summary", label: "Résumé", type: "textarea", required: true, fullWidth: true },
        { name: "category", label: "Catégorie", type: "text" },
        { name: "meta", label: "Prix / budget / date limite", type: "text", help: "Ex. « Sur devis », « Jusqu'à 50 M XOF », « Clôture 30 sept. »" },
        { name: "image", label: "Image", type: "image" },
        PUBLISHED,
      ] },
      { title: "Appel à l'action", fields: [
        { name: "ctaLabel", label: "Libellé du bouton", type: "text", placeholder: "Demander une démo / Candidater / Nous contacter" },
        { name: "ctaUrl", label: "Lien (optionnel)", type: "text", help: "Si vide, le bouton renvoie vers le formulaire de contact de l'espace." },
      ] },
    ],
  },
  empty: () => ({
    slug: "", kind: "service", title: "", summary: "", category: "", meta: "",
    image: "", ctaLabel: "", ctaUrl: "", published: false,
  }),
};

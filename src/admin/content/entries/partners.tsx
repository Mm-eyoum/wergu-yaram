import { Badge } from "@/components/ui/Badge";
import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Partner } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED, SPONSOR } from "./shared";

export const partnersEntry: ContentEntry<Partner> = {
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
      { title: "Sponsoring", fields: [SPONSOR] },
    ],
  },
  empty: () => ({
    slug: "", name: "", category: "ong", categoryLabel: "ONG", zone: "", logo: "", description: "",
    contributionsLabel: "", tags: [], published: false,
  }),
  publicHref: () => `/partenaires`,
};

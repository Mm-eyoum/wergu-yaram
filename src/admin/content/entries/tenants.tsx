import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Tenant } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED } from "./shared";

export const tenantsEntry: ContentEntry<Tenant> = {
  key: "tenants",
  label: "Espaces partenaires",
  singular: "Espace partenaire",
  icon: "globe",
  admin: makeContentAdmin<Tenant>({ collection: "tenants", idField: "slug", titleField: "name", resourceType: "tenant" }),
  columns: [
    { key: "slug", label: "Sous-domaine", render: (t) => `${t.slug}.werguyaram.org` },
    { key: "communities", label: "Communautés", render: (t) => (t.communitySlugs?.length ?? 0) },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "name", label: "Nom du partenaire", type: "text", required: true },
        { name: "slug", label: "Sous-domaine (slug)", type: "slug", slugFrom: "name", required: true },
        { name: "description", label: "Description", type: "textarea" },
        { name: "website", label: "Site officiel (URL)", type: "text" },
        { name: "domain", label: "Domaine personnalisé (optionnel)", type: "text" },
        PUBLISHED,
      ] },
      { title: "Marque", fields: [
        { name: "logo", label: "Logo", type: "image" },
        { name: "theme", label: "Thème", type: "object", fields: [
          { name: "accent", label: "Couleur d'accent (hex)", type: "text", placeholder: "#0B6FB8" },
          { name: "banner", label: "Bannière (URL)", type: "text" },
        ] },
      ] },
      { title: "Contenu agrégé", fields: [
        { name: "communitySlugs", label: "Communautés (slugs)", type: "stringArray" },
        { name: "eventIds", label: "Événements (ids)", type: "stringArray" },
        { name: "articleSlugs", label: "Articles (slugs)", type: "stringArray" },
      ] },
    ],
  },
  empty: () => ({
    slug: "", name: "", description: "", logo: null, theme: { accent: "" },
    communitySlugs: [], eventIds: [], articleSlugs: [], website: "", published: false,
  }),
  publicHref: (t) => `/espace/${t.slug}`,
};

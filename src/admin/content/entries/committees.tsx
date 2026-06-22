import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Committee } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED } from "./shared";

export const committeesEntry: ContentEntry<Committee> = {
  key: "committees",
  label: "Comités",
  singular: "Comité",
  icon: "scale",
  admin: makeContentAdmin<Committee>({ collection: "committees", idField: "slug", titleField: "name", resourceType: "committee" }),
  columns: [
    { key: "tenant", label: "Espace", render: (c) => c.tenantSlug ?? "—" },
    { key: "members", label: "Membres", render: (c) => (c.members?.length ?? 0) },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "name", label: "Nom", type: "text", required: true },
        { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
        { name: "mission", label: "Mission", type: "textarea" },
        { name: "tenantSlug", label: "Espace partenaire rattaché (slug)", type: "text" },
        PUBLISHED,
      ] },
      { title: "Membres", fields: [
        { name: "members", label: "Membres", type: "repeatable", itemLabel: "un membre", fields: [
          { name: "name", label: "Nom", type: "text" },
          { name: "role", label: "Rôle", type: "text" },
          { name: "org", label: "Organisation", type: "text" },
        ] },
      ] },
      { title: "Indicateurs d'impact", fields: [
        { name: "indicators", label: "Indicateurs", type: "repeatable", itemLabel: "un indicateur", fields: [
          { name: "label", label: "Libellé", type: "text" },
          { name: "value", label: "Valeur", type: "text" },
        ] },
      ] },
    ],
  },
  empty: () => ({
    slug: "", name: "", mission: "", tenantSlug: "", members: [], indicators: [], published: false,
  }),
  publicHref: (c) => (c.tenantSlug ? `/espace/${c.tenantSlug}` : `/`),
};

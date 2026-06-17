import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Community } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED } from "./shared";

export const communitiesEntry: ContentEntry<Community> = {
  key: "communities",
  label: "Communautés",
  singular: "Communauté",
  icon: "users",
  admin: makeContentAdmin<Community>({ collection: "communities", idField: "slug", titleField: "name", resourceType: "community" }),
  columns: [
    { key: "topic", label: "Thème", render: (c) => c.topic },
    { key: "members", label: "Membres", render: (c) => c.membersCount },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "name", label: "Nom", type: "text", required: true },
        { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
        { name: "topic", label: "Thème", type: "text" },
        { name: "isPublic", label: "Publique", type: "boolean" },
        PUBLISHED,
      ] },
      { title: "Description", fields: [{ name: "description", label: "Description", type: "textarea" }] },
      { title: "Statistiques", fields: [
        { name: "membersCount", label: "Membres", type: "number" },
        { name: "postsCount", label: "Publications", type: "number" },
      ] },
      { title: "Règles & ressources", fields: [
        { name: "rules", label: "Règles", type: "stringArray" },
        { name: "resources", label: "Ressources", type: "repeatable", itemLabel: "une ressource", fields: [
          { name: "title", label: "Titre", type: "text" },
          { name: "type", label: "Type", type: "text" },
        ] },
        { name: "upcomingEvents", label: "Événements à venir (ids)", type: "stringArray" },
      ] },
    ],
  },
  empty: () => ({
    slug: "", name: "", topic: "", description: "", membersCount: 0, postsCount: 0, isPublic: true,
    rules: [], resources: [], upcomingEvents: [], posts: [], published: false,
  }),
  publicHref: (c) => `/communautes/${c.slug}`,
};

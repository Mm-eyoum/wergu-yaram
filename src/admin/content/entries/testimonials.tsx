import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Testimonial } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED } from "./shared";

export const testimonialsEntry: ContentEntry<Testimonial> = {
  key: "testimonials",
  label: "Témoignages",
  singular: "Témoignage",
  description: "Témoignages / histoires d'impact affichés sur l'espace partenaire (preuve sociale).",
  icon: "quote",
  admin: makeContentAdmin<Testimonial>({ collection: "testimonials", idField: "slug", titleField: "authorName", resourceType: "testimonial" }),
  columns: [
    { key: "author", label: "Auteur", render: (t) => t.authorName },
    { key: "org", label: "Organisation", render: (t) => t.org ?? "—" },
  ],
  schema: {
    groups: [
      { title: "Témoignage", fields: [
        { name: "quote", label: "Citation", type: "textarea", required: true, fullWidth: true },
        { name: "authorName", label: "Nom de l'auteur", type: "text", required: true },
        { name: "slug", label: "Identifiant (slug)", type: "slug", slugFrom: "authorName", required: true },
        { name: "authorRole", label: "Rôle / fonction", type: "text" },
        { name: "org", label: "Organisation", type: "text" },
        { name: "avatar", label: "Photo", type: "image" },
        PUBLISHED,
      ] },
    ],
  },
  empty: () => ({
    slug: "", authorName: "", quote: "", authorRole: "", org: "", avatar: "", published: false,
  }),
};

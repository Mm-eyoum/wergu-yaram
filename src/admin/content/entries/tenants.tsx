import { ExternalLink } from "lucide-react";
import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Tenant } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED } from "./shared";
import { tenantSlugError } from "@/lib/tenantHost";
import { tenantSlugExists } from "@/services/tenants";

export const tenantsEntry: ContentEntry<Tenant> = {
  key: "tenants",
  label: "Espaces partenaires (sous-domaine)",
  singular: "Espace partenaire",
  description: "Espace dédié avec sous-domaine slug.werguyaram.org, branding, contenu agrégé et espace de gestion.",
  group: "Partenaires",
  icon: "globe",
  admin: makeContentAdmin<Tenant>({ collection: "tenants", idField: "slug", titleField: "name", resourceType: "tenant", verifyWrite: true }),
  columns: [
    {
      key: "slug",
      label: "Sous-domaine",
      render: (t) => (
        <a
          href={`https://${t.slug}.werguyaram.org`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-medium text-brand-green hover:underline"
        >
          {t.slug}.werguyaram.org
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ),
    },
    { key: "communities", label: "Communautés", render: (t) => (t.communitySlugs?.length ?? 0) },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "name", label: "Nom du partenaire", type: "text", required: true },
        { name: "slug", label: "Sous-domaine (slug)", type: "slug", slugFrom: "name", required: true, subdomainPreview: true, help: "Ce slug crée le sous-domaine public de l'espace. Non modifiable après création." },
        { name: "description", label: "Description", type: "textarea" },
        { name: "website", label: "Site officiel (URL)", type: "text" },
        { name: "domain", label: "Domaine personnalisé (optionnel)", type: "text" },
        PUBLISHED,
        { name: "showOnPartnersPage", label: "Afficher sur la page publique des partenaires", type: "boolean" },
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
    showOnPartnersPage: true,
  }),
  // Lien « Voir sur le site » de l'éditeur → le sous-domaine public absolu.
  publicHref: (t) => `https://${t.slug}.werguyaram.org`,
  // Le slug = id de document = sous-domaine : verrouillé en édition, validé +
  // contrôlé en unicité à la création (évite l'écrasement silencieux d'un tenant).
  lockOnEdit: ["slug"],
  validate: async (t, { isNew }) => {
    const slug = String(t.slug ?? "");
    const formatError = tenantSlugError(slug);
    if (formatError) return formatError;
    if (isNew && (await tenantSlugExists(slug)))
      return `Le sous-domaine « ${slug}.werguyaram.org » est déjà utilisé.`;
    return null;
  },
};

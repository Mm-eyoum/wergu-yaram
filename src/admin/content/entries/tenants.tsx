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
        { name: "verified", label: "Partenaire vérifié (badge de confiance)", type: "boolean", help: "Réservé aux administrateurs — affiche le label « Vérifié » sur l'espace et l'annuaire." },
        { name: "cotisationLabel", label: "Cotisation (active l'adhésion)", type: "text", placeholder: "7 000 XOF/an", help: "Si renseigné, une section « Devenir membre » apparaît sur l'espace." },
        { name: "apiKey", label: "Clé API d'impact (admin)", type: "text", help: "Donne accès en lecture à l'endpoint /api/impact pour l'intégration SI du bailleur." },
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
      { title: "Gestion & accès", fields: [
        { name: "ownerUid", label: "Propriétaire (compte)", type: "userRefs", single: true, help: "Accès complet à l'espace de gestion /espace/<slug>/gestion." },
        { name: "managerUids", label: "Co-gestionnaires", type: "userRefs", help: "Comptes autorisés à gérer cet espace (en plus du propriétaire)." },
      ] },
      { title: "Gouvernance & impact", fields: [
        { name: "committee", label: "Comité de pilotage", type: "object", fullWidth: true, fields: [
          { name: "name", label: "Nom du comité", type: "text" },
          { name: "mission", label: "Mission", type: "textarea" },
          { name: "members", label: "Membres", type: "repeatable", itemLabel: "un membre", fullWidth: true, fields: [
            { name: "name", label: "Nom", type: "text" },
            { name: "role", label: "Rôle", type: "text" },
            { name: "org", label: "Organisation", type: "text" },
          ] },
          { name: "indicators", label: "Indicateurs d'impact", type: "repeatable", itemLabel: "un indicateur", fullWidth: true, fields: [
            { name: "label", label: "Libellé", type: "text" },
            { name: "value", label: "Valeur", type: "text" },
          ] },
        ] },
      ] },
    ],
  },
  empty: () => ({
    slug: "", name: "", description: "", logo: null, theme: { accent: "" },
    communitySlugs: [], eventIds: [], articleSlugs: [], website: "", published: false,
    showOnPartnersPage: true,
    ownerUid: "", managerUids: [],
    committee: { name: "", mission: "", members: [], indicators: [] },
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

import type { FieldDef } from "@/components/admin/fields/SchemaForm";

/** Reusable field fragments shared across content-type schemas. */
export const PUBLISHED: FieldDef = { name: "published", label: "Publié", type: "boolean" };

export const TRUST: FieldDef = {
  name: "trust",
  label: "Confiance",
  type: "object",
  fields: [
    { name: "verified", label: "Vérifié", type: "boolean" },
    { name: "source", label: "Source", type: "text" },
    { name: "updatedAt", label: "Mis à jour le", type: "text", placeholder: "2024-01-01" },
  ],
};

/**
 * Sponsoring de contenu (Ligne 4). Étiquetage strict : jamais de marque de
 * médicament (cf. RegulatoryMeta) — institutions / ONG / prévention uniquement.
 */
export const SPONSOR: FieldDef = {
  name: "sponsor",
  label: "Sponsoring",
  type: "object",
  fields: [
    { name: "name", label: "Nom du sponsor", type: "text" },
    { name: "logo", label: "Logo", type: "image" },
    { name: "url", label: "Lien", type: "text" },
  ],
};

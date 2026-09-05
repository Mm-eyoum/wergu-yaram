import type { ReactNode } from "react";
import type { ContentAdmin } from "@/services/admin/contentAdmin";
import type { ContentFormSchema } from "@/components/admin/fields/SchemaForm";

/** A table column for the content list. */
export interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

/** Everything the admin CMS needs to manage one content type. */
export interface ContentEntry<T extends object> {
  /** Route segment + id, e.g. "articles". */
  key: string;
  /** Plural label, e.g. "Articles". */
  label: string;
  /** Singular label, e.g. "Article". */
  singular: string;
  /**
   * Phrase courte expliquant ce que gère ce type — affichée sous le titre de la
   * liste et dans le hub. Sert à lever toute ambiguïté entre types proches
   * (ex. fiche éditoriale SANS sous-domaine vs espace AVEC sous-domaine).
   */
  description?: string;
  /** Lucide icon name handled by the hub page. */
  icon: string;
  admin: ContentAdmin<T>;
  columns: Column<T>[];
  schema: ContentFormSchema;
  /** A blank record for the "new" form. */
  empty: () => T;
  /** Public-site path for a "view" link (by id/slug), if any. */
  publicHref?: (item: T) => string;
  /**
   * Validation métier optionnelle, jouée avant l'enregistrement. Renvoie un
   * message d'erreur (bloque la sauvegarde) ou `null`/`undefined` si valide.
   * Peut être asynchrone (ex. vérif d'unicité Firestore).
   */
  validate?: (item: T, ctx: { isNew: boolean }) => Promise<string | null> | string | null;
  /**
   * Champs verrouillés (lecture seule) en édition uniquement — typiquement
   * l'identifiant/slug qui sert d'id de document (le changer casse les URLs).
   */
  lockOnEdit?: string[];
  /**
   * Regroupe plusieurs types sous un même menu + sous-onglets (ex. "Partenaires").
   * Purement présentationnel — aucune autre mécanique ne le lit.
   */
  group?: string;
}

// Heterogeneous registry: each entry is authored against its real type, but
// the lookup table erases to `unknown` at the boundary (consumers re-narrow).
export type AnyContentEntry = ContentEntry<Record<string, unknown>>;

/** Helpers shared by entries. */
export const idField = <T,>(item: T, field: keyof T) => String(item[field]);

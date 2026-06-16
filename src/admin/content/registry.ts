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
  /** Lucide icon name handled by the hub page. */
  icon: string;
  admin: ContentAdmin<T>;
  columns: Column<T>[];
  schema: ContentFormSchema;
  /** A blank record for the "new" form. */
  empty: () => T;
  /** Public-site path for a "view" link (by id/slug), if any. */
  publicHref?: (item: T) => string;
}

// Heterogeneous registry: each entry is authored against its real type, but
// the lookup table erases to `unknown` at the boundary (consumers re-narrow).
export type AnyContentEntry = ContentEntry<Record<string, unknown>>;

/** Helpers shared by entries. */
export const idField = <T,>(item: T, field: keyof T) => String(item[field]);

/**
 * Registre des collections exposées par l'API générique.
 *
 * C'est LE fichier qui maintient en vie les trois couches du client qui prennent
 * un nom de collection à l'exécution (catalog.ts, admin/contentAdmin.ts,
 * tenantAnalytics.ts). Sans lui, il faudrait réécrire ces couches en dur.
 *
 * ⚠️ Le nom de collection n'est JAMAIS interpolé dans du SQL : il sert de clé
 * dans ce registre, et une entrée absente donne 404. Idem pour les champs de
 * filtre et de tri, validés contre les listes ci-dessous — sans quoi un
 * `?orderBy=` arbitraire deviendrait une injection de chemin JSON.
 */
import {
  editorialPolicy,
  equipmentNeedsPolicy,
  facilitiesPolicy,
  tenantContentPolicy,
} from "../policy/collections";
import type { Policy } from "../policy/types";

export interface Registration {
  /** Colonne générée ou champ JSON servant d'identifiant métier. */
  idField: "slug" | "id";
  /** Champs acceptés en filtre, mappés vers leur expression SQL. */
  filterable: Record<string, string>;
  /** Champs acceptés en tri, mappés vers leur expression SQL. */
  sortable: Record<string, string>;
  policy: (id: string) => Policy;
}

/** Colonnes générées disponibles sur `documents` (cf. migration 0001). */
const COMMON_FILTERS: Record<string, string> = {
  tenantSlug: "tenant_slug",
  ownerUid: "owner_uid",
  published: "published",
};
const COMMON_SORTS: Record<string, string> = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  name: "sort_title",
  title: "sort_title",
};

function contentEntry(policy: Policy, idField: "slug" | "id" = "slug"): Registration {
  return { idField, filterable: { ...COMMON_FILTERS }, sortable: { ...COMMON_SORTS }, policy: () => policy };
}

export const REGISTRY: Record<string, Registration> = {
  medications: contentEntry(editorialPolicy),
  pathologies: contentEntry(editorialPolicy),
  partners: contentEntry(editorialPolicy),
  articles: contentEntry(tenantContentPolicy),
  communities: contentEntry(tenantContentPolicy),
  events: contentEntry(tenantContentPolicy, "id"),
  formations: contentEntry(tenantContentPolicy),
  testimonials: contentEntry(tenantContentPolicy),
  partnerOffers: contentEntry(tenantContentPolicy),
  tenants: contentEntry(tenantContentPolicy),
  equipmentNeeds: contentEntry(equipmentNeedsPolicy, "id"),
  facilities: {
    idField: "slug",
    filterable: { ...COMMON_FILTERS, source: "source", placeId: "place_id" },
    sortable: { ...COMMON_SORTS },
    policy: facilitiesPolicy,
  },
};

/** Collections servies par l'endpoint d'export du catalogue. */
export const DOCUMENT_COLLECTIONS = Object.keys(REGISTRY);

export function lookup(name: string): Registration | null {
  return Object.prototype.hasOwnProperty.call(REGISTRY, name) ? REGISTRY[name] : null;
}

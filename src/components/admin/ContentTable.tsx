import { Link } from "react-router-dom";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Column } from "@/admin/content/registry";

/**
 * Generic content list table: title + custom columns + publish status, with
 * per-row edit / publish-toggle / delete actions. Presentational — the page
 * owns data fetching and mutations.
 */
export function ContentTable<T extends Record<string, unknown>>({
  items,
  columns,
  getId,
  getTitle,
  isPublished,
  editHref,
  onTogglePublish,
  onDelete,
  busyId,
}: {
  items: T[];
  columns: Column<T>[];
  getId: (item: T) => string;
  getTitle: (item: T) => string;
  isPublished: (item: T) => boolean;
  editHref: (item: T) => string;
  onTogglePublish: (item: T) => void;
  onDelete: (item: T) => void;
  busyId?: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/5 bg-brand-soft text-left text-xs uppercase tracking-wide text-text-secondary dark:border-white/10 dark:bg-white/5">
            <th className="px-4 py-3 font-semibold">Titre</th>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-semibold">
                {c.label}
              </th>
            ))}
            <th className="px-4 py-3 font-semibold">Statut</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const id = getId(item);
            const published = isPublished(item);
            return (
              <tr key={id} className="border-b border-black/5 last:border-0 hover:bg-brand-soft/50 dark:border-white/5 dark:hover:bg-white/5">
                <td className="px-4 py-3">
                  <Link to={editHref(item)} className="font-semibold text-text-primary hover:text-brand-green dark:text-white">
                    {getTitle(item)}
                  </Link>
                </td>
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-text-secondary dark:text-white/70">
                    {c.render(item)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <Badge tone={published ? "green" : "warning"}>{published ? "Publié" : "Brouillon"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={editHref(item)}
                      aria-label="Modifier"
                      className="grid h-8 w-8 place-items-center rounded-lg text-text-secondary hover:bg-brand-mint hover:text-brand-green"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      aria-label={published ? "Dépublier" : "Publier"}
                      disabled={busyId === id}
                      onClick={() => onTogglePublish(item)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-text-secondary hover:bg-brand-soft disabled:opacity-40 dark:hover:bg-white/10"
                    >
                      {published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      aria-label="Supprimer"
                      disabled={busyId === id}
                      onClick={() => onDelete(item)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-text-secondary hover:bg-danger/10 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

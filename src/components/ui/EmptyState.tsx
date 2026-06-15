import { SearchX } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title = "Aucun résultat",
  message = "Essayez d'ajuster votre recherche ou vos filtres.",
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border-soft bg-white px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-mint text-brand-green">
        {icon ?? <SearchX className="h-6 w-6" />}
      </span>
      <h3 className="text-base font-bold text-text-primary">{title}</h3>
      <p className="max-w-sm text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  );
}

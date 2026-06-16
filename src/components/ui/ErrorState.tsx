import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** Presentable error state with an optional retry — never a raw stack trace. */
export function ErrorState({
  title = "Une erreur est survenue",
  message = "Impossible de charger ces données pour le moment.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-danger/30 bg-white px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h3 className="text-base font-bold text-text-primary">{title}</h3>
      <p className="max-w-sm text-sm text-text-secondary">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-xl border border-border-soft px-4 py-2 text-sm font-semibold text-text-primary hover:border-brand-teal hover:text-brand-green"
        >
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </button>
      )}
    </div>
  );
}

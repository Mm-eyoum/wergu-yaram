import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center gap-3 py-12 text-text-secondary"
    >
      <Loader2 className="h-7 w-7 animate-spin text-brand-green" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Skeleton block for content placeholders. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-100", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card-surface space-y-3 p-5">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

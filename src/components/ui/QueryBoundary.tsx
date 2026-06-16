import type { ReactNode } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

interface QueryBoundaryProps<T> {
  /** Minimal slice of a TanStack Query result. */
  query: {
    data: T | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch?: () => void;
  };
  children: (data: T) => ReactNode;
  /** True when `data` should be treated as empty (e.g. `(d) => d.length === 0`). */
  isEmpty?: (data: T) => boolean;
  loading?: ReactNode;
  empty?: ReactNode;
  errorTitle?: string;
  errorMessage?: string;
}

/**
 * Renders the right state for a query: loading → error (with retry) → empty → data.
 * Standardises the loading/error/empty contract across every data-backed surface.
 */
export function QueryBoundary<T>({
  query,
  children,
  isEmpty,
  loading,
  empty,
  errorTitle,
  errorMessage,
}: QueryBoundaryProps<T>) {
  if (query.isLoading) return <>{loading ?? <LoadingState />}</>;
  if (query.isError || query.data === undefined) {
    return <ErrorState title={errorTitle} message={errorMessage} onRetry={query.refetch} />;
  }
  if (isEmpty?.(query.data)) return <>{empty ?? <EmptyState />}</>;
  return <>{children(query.data)}</>;
}

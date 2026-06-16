import { Users } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

/** Shared loading / error / empty wrapper for admin list sections. */
export function AdminSection({
  loading,
  error,
  refetch,
  empty,
  emptyTitle,
  emptyMessage,
  children,
}: {
  loading: boolean;
  error: boolean;
  refetch?: () => void;
  empty?: boolean;
  emptyTitle: string;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={refetch} />;
  if (empty)
    return <EmptyState title={emptyTitle} message={emptyMessage} icon={<Users className="h-6 w-6" />} />;
  return <>{children}</>;
}

import type { ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchTenantForManager } from "@/services/tenants";
import { can } from "@/lib/permissions";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Gate for the partner management area (/espace/:slug/gestion). Requires a
 * signed-in user who owns or co-manages the tenant — or any admin/editor
 * (override). Authority is DATA-DRIVEN (tenant.ownerUid/managerUids), not a
 * global role. Mirrors the ManageFacility ownership check.
 */
export function PartnerProtectedRoute({ children }: { children: ReactNode }) {
  const { slug } = useParams();
  const { user, loading } = useAuth();
  const location = useLocation();

  const tenantQuery = useQuery({
    queryKey: ["partner", "tenant", slug],
    queryFn: () => fetchTenantForManager(slug!),
    enabled: !!slug,
  });

  if (loading || tenantQuery.isLoading) return <LoadingState label="Chargement de l'espace…" />;
  if (!user) return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;

  const tenant = tenantQuery.data;
  const isManager =
    !!tenant && (tenant.ownerUid === user.uid || !!tenant.managerUids?.includes(user.uid));
  const isStaff = can(user.role, "content.edit"); // editors/admins always pass

  if (!tenant) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Espace introuvable" message="Cet espace partenaire n'existe pas." />
      </div>
    );
  }
  if (!isManager && !isStaff) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Accès réservé"
          message="Vous n'êtes pas gestionnaire de cet espace partenaire."
        />
      </div>
    );
  }

  return <>{children}</>;
}

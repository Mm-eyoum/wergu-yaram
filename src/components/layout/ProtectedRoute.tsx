import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import type { Role } from "@/types/domain";

/**
 * Guards routes that require authentication, and optionally a minimum role.
 * `requireRole="admin"` admits admin + super_admin; `"super_admin"` admits only
 * super_admin. Client-side gate only — the real protection is in Firestore rules.
 */
export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: Role;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container-page py-24">
        <LoadingState label="Vérification de votre session…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  }

  if (requireRole && !roleSatisfies(user.role, requireRole)) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="Accès réservé"
          message="Vous n'avez pas les autorisations nécessaires pour accéder à cette page."
          action={<ButtonLink to="/dashboard" size="sm">Retour au tableau de bord</ButtonLink>}
        />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Roles are ranked; a higher rank satisfies any lower requirement.
 * patient_public / health_pro < editor < admin < super_admin.
 * `health_pro` is a patient-level verified badge — same access rank as patient_public.
 */
const ROLE_RANK: Record<Role, number> = {
  patient_public: 0,
  health_pro: 0,
  editor: 1,
  admin: 2,
  super_admin: 3,
};

function roleSatisfies(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

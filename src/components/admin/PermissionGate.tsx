import { useAuth } from "@/hooks/useAuth";
import { can, type Permission } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Renders `children` only if the signed-in user's role satisfies `permission`.
 * UI convenience only — server-side Firestore rules are the real gate.
 *
 * @example
 * <PermissionGate permission="users.manage">
 *   <Button>Promouvoir admin</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  return <>{can(user?.role, permission) ? children : fallback}</>;
}

/** Hook form, for guarding logic rather than markup. */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return can(user?.role, permission);
}

/**
 * Route-level guard: renders an "access reserved" state instead of the page
 * when the role lacks `permission`. Used for admin child routes (the shell is
 * reachable by editors, but individual sections may be admin-only).
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (can(user?.role, permission)) return <>{children}</>;
  return (
    <div className="py-16">
      <EmptyState
        title="Accès réservé"
        message="Cette section n'est pas accessible avec votre rôle."
        action={<ButtonLink to="/admin" size="sm">Retour au tableau de bord</ButtonLink>}
      />
    </div>
  );
}

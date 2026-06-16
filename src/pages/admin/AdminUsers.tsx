import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/hooks/useToast";
import { useAllUsers, adminKeys } from "@/hooks/useAdminData";
import { setUserRole, setUserStatus } from "@/services/users";
import { logAudit } from "@/services/audit";
import { ROLE_LABELS } from "@/lib/constants";
import { AdminSection } from "@/components/admin/AdminSection";
import { usePermission } from "@/components/admin/PermissionGate";
import type { AppUser, Role, UserStatus } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

/** Roles a super_admin may assign through the UI (never super_admin itself). */
const ASSIGNABLE_ROLES: Role[] = ["patient_public", "editor", "admin"];

export default function AdminUsers() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const canManageRoles = usePermission("roles.manage");
  const users = useAllUsers(true);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users.data ?? [];
    return (users.data ?? []).filter(
      (u) =>
        (u.displayName ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q),
    );
  }, [users.data, search]);

  const userStatus = useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: UserStatus; name: string }) =>
      setUserStatus(uid, status),
    onSuccess: (_d, vars) => {
      void logAudit({
        action: "status_change",
        resourceType: "user",
        resourceId: vars.uid,
        resourceTitle: vars.name,
        changes: { status: { old: vars.status === "active" ? "suspended" : "active", new: vars.status } },
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.users });
      notify("Statut mis à jour ✓", "success");
    },
    onError: () => notify("Action impossible.", "error"),
  });

  const userRole = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: Role; oldRole: Role; name: string }) =>
      setUserRole(uid, role),
    onSuccess: (_d, vars) => {
      void logAudit({
        action: "role_change",
        resourceType: "user",
        resourceId: vars.uid,
        resourceTitle: vars.name,
        changes: { role: { old: vars.oldRole, new: vars.role } },
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.users });
      notify("Rôle mis à jour ✓", "success");
    },
    onError: () => notify("Action réservée au super-administrateur.", "error"),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Utilisateurs" noIndex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">
          Utilisateurs
        </h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          Gérez les comptes{canManageRoles && " et les rôles"}.
        </p>
      </header>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un nom ou email…"
          className="w-full rounded-xl border border-black/10 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      <AdminSection
        loading={users.isLoading}
        error={users.isError}
        refetch={users.refetch}
        empty={filtered.length === 0}
        emptyTitle="Aucun utilisateur"
        emptyMessage="Aucun compte ne correspond à votre recherche."
      >
        <div className="space-y-2">
          {filtered.map((u) => (
            <UserRow key={u.uid} u={u}>
              {canManageRoles && u.role !== "super_admin" && (
                <select
                  value={u.role}
                  onChange={(e) =>
                    userRole.mutate({ uid: u.uid, role: e.target.value as Role, oldRole: u.role, name: u.displayName ?? "Utilisateur" })
                  }
                  disabled={userRole.isPending}
                  className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs font-medium dark:border-white/10 dark:bg-white/5 dark:text-white"
                  aria-label={`Rôle de ${u.displayName ?? "l'utilisateur"}`}
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              )}
              {u.status === "suspended" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => userStatus.mutate({ uid: u.uid, status: "active", name: u.displayName ?? "Utilisateur" })}
                  disabled={userStatus.isPending}
                >
                  Réactiver
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => userStatus.mutate({ uid: u.uid, status: "suspended", name: u.displayName ?? "Utilisateur" })}
                  disabled={userStatus.isPending || u.role === "super_admin"}
                >
                  Suspendre
                </Button>
              )}
            </UserRow>
          ))}
        </div>
      </AdminSection>
    </div>
  );
}

function UserRow({ u, children }: { u: AppUser; children: React.ReactNode }) {
  return (
    <div className="card-surface flex flex-wrap items-center gap-3 p-3.5">
      <Avatar name={u.displayName ?? "Utilisateur"} src={u.photoURL} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-text-primary">{u.displayName ?? "Utilisateur"}</p>
        <p className="truncate text-xs text-text-secondary">{u.email}</p>
      </div>
      <Badge tone={u.role === "patient_public" ? "neutral" : "navy"}>{ROLE_LABELS[u.role]}</Badge>
      <Badge tone={u.status === "active" ? "green" : u.status === "suspended" ? "danger" : "warning"}>
        {u.status === "active" ? "Actif" : u.status === "suspended" ? "Suspendu" : "En attente"}
      </Badge>
      {children}
    </div>
  );
}

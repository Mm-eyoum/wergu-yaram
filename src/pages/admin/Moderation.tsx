import { useState } from "react";
import { Building2, CheckCircle2, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { usePendingOrganizations, adminKeys } from "@/hooks/useAdminData";
import { setOrganizationStatus } from "@/services/organizations";
import { fetchPendingClaims, approveClaim, rejectClaim } from "@/services/claims";
import { logAudit } from "@/services/audit";
import { ORG_TYPE_LABELS } from "@/lib/constants";
import { AdminSection } from "@/components/admin/AdminSection";
import type { ClaimRequest } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

type ModTab = "pages" | "claims";

export default function Moderation() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ModTab>("pages");

  const pendingOrgs = usePendingOrganizations(tab === "pages");
  const claims = useQuery({
    queryKey: adminKeys.pendingClaims,
    queryFn: fetchPendingClaims,
    enabled: tab === "claims",
  });

  const orgStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "suspended"; name: string }) =>
      setOrganizationStatus(id, status),
    onSuccess: (_data, vars) => {
      void logAudit({
        action: vars.status === "active" ? "approve" : "reject",
        resourceType: "organization",
        resourceId: vars.id,
        resourceTitle: vars.name,
        changes: { status: { old: "pending", new: vars.status } },
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingOrgs });
      notify(vars.status === "active" ? "Page validée ✓" : "Page rejetée.", "success");
    },
    onError: () => notify("Action impossible.", "error"),
  });

  const claimAction = useMutation({
    mutationFn: ({ claim, approve }: { claim: ClaimRequest; approve: boolean }) =>
      approve ? approveClaim(claim) : rejectClaim(claim),
    onSuccess: (_d, vars) => {
      void logAudit({
        action: vars.approve ? "approve" : "reject",
        resourceType: "claimRequest",
        resourceId: vars.claim.id,
        resourceTitle: vars.claim.orgName,
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingClaims });
      notify(vars.approve ? "Réclamation approuvée ✓" : "Réclamation rejetée.", "success");
    },
    onError: () => notify("Action impossible.", "error"),
  });

  const tabs: TabItem[] = [
    { key: "pages", label: "Pages à valider", count: pendingOrgs.data?.length },
    { key: "claims", label: "Réclamations", count: claims.data?.length },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Modération des pages" noIndex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">
          Modération des pages
        </h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          Validez les pages soumises et traitez les demandes de gestion.
        </p>
      </header>

      <Tabs items={tabs} active={tab} onChange={(k) => setTab(k as ModTab)} className="mb-6" />

      {tab === "pages" && (
        <AdminSection
          loading={pendingOrgs.isLoading}
          error={pendingOrgs.isError}
          refetch={pendingOrgs.refetch}
          empty={pendingOrgs.data?.length === 0}
          emptyTitle="Aucune page en attente"
          emptyMessage="Toutes les pages soumises ont été traitées."
        >
          <div className="space-y-3">
            {pendingOrgs.data?.map((org) => (
              <div key={org.id} className="card-surface flex flex-wrap items-center gap-3 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-text-primary">{org.name}</p>
                  <p className="text-xs text-text-secondary">
                    {ORG_TYPE_LABELS[org.type]}
                    {org.region ? ` · ${org.region}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => orgStatus.mutate({ id: org.id, status: "active", name: org.name })}
                    disabled={orgStatus.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => orgStatus.mutate({ id: org.id, status: "suspended", name: org.name })}
                    disabled={orgStatus.isPending}
                  >
                    <XCircle className="h-4 w-4" /> Rejeter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </AdminSection>
      )}

      {tab === "claims" && (
        <AdminSection
          loading={claims.isLoading}
          error={claims.isError}
          refetch={claims.refetch}
          empty={claims.data?.length === 0}
          emptyTitle="Aucune réclamation"
          emptyMessage="Aucune demande de gestion de page en attente."
        >
          <div className="space-y-3">
            {claims.data?.map((c) => (
              <div key={c.id} className="card-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-text-primary">{c.orgName}</p>
                    <p className="text-xs text-text-secondary">Demandé par {c.requesterName}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => claimAction.mutate({ claim: c, approve: true })}
                      disabled={claimAction.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => claimAction.mutate({ claim: c, approve: false })}
                      disabled={claimAction.isPending}
                    >
                      <XCircle className="h-4 w-4" /> Rejeter
                    </Button>
                  </div>
                </div>
                {c.justification && (
                  <p className="mt-2 rounded-xl bg-brand-soft px-3 py-2 text-sm text-text-secondary">
                    {c.justification}
                  </p>
                )}
              </div>
            ))}
          </div>
        </AdminSection>
      )}
    </div>
  );
}

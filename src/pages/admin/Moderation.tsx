import { useState } from "react";
import { Building2, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { usePendingOrganizations, adminKeys } from "@/hooks/useAdminData";
import { setOrganizationStatus } from "@/services/organizations";
import { fetchPendingClaims, approveClaim, rejectClaim } from "@/services/claims";
import { fetchPendingFacilities, publishFacility } from "@/services/facilities";
import {
  fetchPendingVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
} from "@/services/professionalVerification";
import { logAudit } from "@/services/audit";
import { ORG_TYPE_LABELS } from "@/lib/constants";
import { AdminSection } from "@/components/admin/AdminSection";
import type { ClaimRequest, ProfessionalVerificationRequest } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

type ModTab = "pages" | "claims" | "facilities" | "verifications";

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
  const pendingFacilities = useQuery({
    queryKey: ["admin", "pendingFacilities"],
    queryFn: fetchPendingFacilities,
    enabled: tab === "facilities",
  });
  const verifications = useQuery({
    queryKey: adminKeys.pendingVerifications,
    queryFn: fetchPendingVerificationRequests,
    enabled: tab === "verifications",
  });

  const publish = useMutation({
    mutationFn: ({ slug }: { slug: string; name: string }) => publishFacility(slug),
    onSuccess: (_d, vars) => {
      void logAudit({
        action: "publish",
        resourceType: "facility",
        resourceId: vars.slug,
        resourceTitle: vars.name,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "pendingFacilities"] });
      notify("Établissement publié ✓", "success");
    },
    onError: () => notify("Publication impossible.", "error"),
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

  const verificationAction = useMutation({
    mutationFn: ({ req, approve }: { req: ProfessionalVerificationRequest; approve: boolean }) =>
      approve ? approveVerificationRequest(req) : rejectVerificationRequest(req),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingVerifications });
      notify(
        vars.approve ? "Professionnel vérifié ✓" : "Demande de vérification rejetée.",
        "success",
      );
    },
    onError: () => notify("Action impossible.", "error"),
  });

  const tabs: TabItem[] = [
    { key: "pages", label: "Pages à valider", count: pendingOrgs.data?.length },
    { key: "claims", label: "Réclamations", count: claims.data?.length },
    { key: "facilities", label: "Établissements à valider", count: pendingFacilities.data?.length },
    { key: "verifications", label: "Vérifications pro", count: verifications.data?.length },
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

      {tab === "facilities" && (
        <AdminSection
          loading={pendingFacilities.isLoading}
          error={pendingFacilities.isError}
          refetch={pendingFacilities.refetch}
          empty={pendingFacilities.data?.length === 0}
          emptyTitle="Aucun établissement à valider"
          emptyMessage="Les établissements revendiqués et complétés par leur propriétaire apparaîtront ici."
        >
          <div className="space-y-3">
            {pendingFacilities.data?.map((f) => (
              <div key={f.slug} className="card-surface p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-text-primary">{f.name}</p>
                    <p className="truncate text-xs text-text-secondary">
                      {[f.type, f.city || f.address, f.region].filter(Boolean).join(" · ") ||
                        "Localisation non renseignée"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => publish.mutate({ slug: f.slug, name: f.name })}
                    disabled={publish.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Publier
                  </Button>
                </div>
                {(f.description || f.specialties?.length || f.services?.length) && (
                  <div className="mt-3 space-y-1 rounded-xl bg-brand-soft px-3 py-2 text-xs text-text-secondary">
                    {f.description && <p className="line-clamp-2">{f.description}</p>}
                    {f.specialties?.length > 0 && <p><b>Spécialités :</b> {f.specialties.join(", ")}</p>}
                    {f.services?.length > 0 && <p><b>Services :</b> {f.services.join(", ")}</p>}
                    {f.phone && <p><b>Tél :</b> {f.phone}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </AdminSection>
      )}

      {tab === "verifications" && (
        <AdminSection
          loading={verifications.isLoading}
          error={verifications.isError}
          refetch={verifications.refetch}
          empty={verifications.data?.length === 0}
          emptyTitle="Aucune demande de vérification"
          emptyMessage="Aucune demande de statut « professionnel de santé » en attente."
        >
          <div className="space-y-3">
            {verifications.data?.map((req) => (
              <div key={req.id} className="card-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 font-bold text-text-primary">
                      <ShieldCheck className="h-4 w-4 text-brand-green" /> {req.requesterName}
                    </p>
                    <p className="text-xs text-text-secondary">{req.requesterEmail}</p>
                    {req.specialties?.length ? (
                      <p className="mt-1 text-xs text-text-secondary"><b>Spécialités :</b> {req.specialties.join(", ")}</p>
                    ) : null}
                    {req.licenseNumber && (
                      <p className="text-xs text-text-secondary"><b>N° licence :</b> {req.licenseNumber}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => verificationAction.mutate({ req, approve: true })}
                      disabled={verificationAction.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verificationAction.mutate({ req, approve: false })}
                      disabled={verificationAction.isPending}
                    >
                      <XCircle className="h-4 w-4" /> Rejeter
                    </Button>
                  </div>
                </div>
                {req.justification && (
                  <p className="mt-2 rounded-xl bg-brand-soft px-3 py-2 text-sm text-text-secondary">
                    {req.justification}
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

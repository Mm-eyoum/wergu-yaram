import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Building2, ExternalLink } from "lucide-react";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { LocationPicker, type LocationValue } from "@/components/map/LocationPicker";
import { PlanPicker } from "@/components/billing/PlanPicker";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { dashboardKeys } from "@/hooks/useDashboardData";
import { fetchOrganization, updateOrganizationProfile } from "@/services/organizations";
import { fetchOrgSubscription } from "@/services/billing";
import { ORG_TYPE_LABELS, SENEGAL_REGIONS } from "@/lib/constants";
import type { OrgStatus } from "@/types/domain";
import { formatDate } from "@/lib/format";
import { SEOHead } from "@/seo/SEOHead";

const STATUS_TONE: Record<OrgStatus, "green" | "warning" | "danger"> = {
  active: "green",
  pending: "warning",
  suspended: "danger",
};
const STATUS_TEXT: Record<OrgStatus, string> = {
  active: "Validée — visible publiquement",
  pending: "En attente de validation par un administrateur",
  suspended: "Suspendue",
};

export default function ManagePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const orgQuery = useQuery({
    queryKey: ["organization", id],
    queryFn: () => fetchOrganization(id!),
    enabled: !!id,
  });

  const org = orgQuery.data;
  const canManage =
    !!user && !!org && (org.ownerUid === user.uid || org.managerUids.includes(user.uid));

  const subQuery = useQuery({
    queryKey: ["orgSubscription", id],
    queryFn: () => fetchOrgSubscription(id!),
    enabled: !!id && !!org,
  });

  const [name, setName] = useState("");
  const [region, setRegion] = useState(SENEGAL_REGIONS[1]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LocationValue>({ address: "", city: "", coords: null });

  // Pre-fill the form once the page loads (edit mode).
  useEffect(() => {
    if (org) {
      setName(org.name);
      setRegion(org.region || SENEGAL_REGIONS[1]);
      setDescription(org.description || "");
      setLocation({ address: org.address || "", city: org.city || "", coords: org.coords ?? null });
    }
  }, [org]);

  const save = useMutation({
    mutationFn: () =>
      updateOrganizationProfile(id!, {
        name: name.trim(),
        region,
        description: description.trim(),
        address: location.address.trim(),
        city: location.city.trim(),
        coords: location.coords ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
      if (user) queryClient.invalidateQueries({ queryKey: dashboardKeys.organizations(user.uid) });
      notify("Page mise à jour ✓", "success");
    },
    onError: () => notify("Impossible d'enregistrer les modifications.", "error"),
  });

  if (orgQuery.isLoading) {
    return <div className="container-page py-16"><LoadingState /></div>;
  }
  if (orgQuery.isError) {
    return <div className="container-page py-16"><ErrorState onRetry={orgQuery.refetch} /></div>;
  }
  if (!org) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Page introuvable" noIndex />
        <EmptyState title="Page introuvable" message="Cette page n'existe pas ou a été supprimée." />
      </div>
    );
  }
  if (!canManage) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Accès réservé" noIndex />
        <EmptyState
          title="Accès réservé"
          message="Vous ne gérez pas cette page."
          action={<Link to="/dashboard" className="text-sm font-semibold text-brand-green hover:underline">Retour au tableau de bord</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-page max-w-2xl py-8">
      <SEOHead title={`Gérer — ${org.name}`} noIndex />

      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-green">
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>

      <header className="mb-6 flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
          <Building2 className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 truncate text-2xl font-extrabold">
            {org.name}
            {org.planTier && <BadgeCheck className="h-5 w-5 shrink-0 text-brand-green" aria-label="Vérifié" />}
          </h1>
          <p className="text-sm text-text-secondary">{ORG_TYPE_LABELS[org.type]}</p>
        </div>
        <Badge tone={STATUS_TONE[org.status]}>{STATUS_TEXT[org.status]}</Badge>
      </header>

      {org.status === "active" && (
        <Link
          to={`/structures/${org.id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green hover:underline"
        >
          <ExternalLink className="h-4 w-4" /> Voir la page publique
        </Link>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            notify("Le nom est obligatoire.", "error");
            return;
          }
          save.mutate();
        }}
        className="card-surface space-y-5 p-6"
      >
        <FormInput label="Nom de la page" required value={name} onChange={(e) => setName(e.target.value)} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Région</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-11 w-full rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
          >
            {SENEGAL_REGIONS.slice(1).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        {org.type === "healthcare_facility" && (
          <LocationPicker label="Localisation de la structure" value={location} onChange={setLocation} />
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-border-soft bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
          />
        </div>

        <p className="rounded-xl bg-brand-soft px-3 py-2 text-xs text-text-secondary">
          Le statut de validation est géré par l'équipe Wergu Yaram et ne peut pas être modifié ici.
        </p>

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>

      {/* Abonnement (Vérifié / Pro) */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-text-primary">Visibilité & abonnement</h2>
        {subQuery.data?.status === "active" ? (
          <div className="card-surface mt-3 p-6">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-brand-green" />
              <p className="font-bold text-text-primary">
                Abonnement {org.planTier === "pro" ? "Pro" : "Vérifié"} actif
              </p>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Renouvellement avant le {formatDate(subQuery.data.currentPeriodEnd)}.
              {org.planTier === "pro" && " Votre page est mise en avant dans l'annuaire et sur la carte."}
            </p>
            <div className="mt-4">
              <PlanPicker orgId={org.id} currentPlanId={org.planId} />
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="mb-4 text-sm text-text-secondary">
              Gagnez en crédibilité avec un badge « Vérifié », des statistiques et — en Pro — une
              mise en avant dans l'annuaire et sur la carte.
            </p>
            <PlanPicker orgId={org.id} currentPlanId={org.planId} />
          </div>
        )}
      </section>
    </div>
  );
}

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Building2, Clock, MapPin, Phone, ShieldQuestion, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { LazyMapView } from "@/components/map/LazyMapView";
import { DirectionsButton } from "@/components/map/DirectionsButton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { fetchOrganization } from "@/services/organizations";
import { requestClaim, fetchUserClaims } from "@/services/claims";
import { SEOHead } from "@/seo/SEOHead";

/** Public view of an organization/directory page, with the "claim" flow. */
export default function OrganizationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [justification, setJustification] = useState("");
  const [showForm, setShowForm] = useState(false);

  const orgQuery = useQuery({
    queryKey: ["organization", id],
    queryFn: () => fetchOrganization(id!),
    enabled: !!id,
  });
  const org = orgQuery.data;

  const claimsQuery = useQuery({
    queryKey: ["userClaims", user?.uid],
    queryFn: () => fetchUserClaims(user!.uid),
    enabled: !!user,
  });
  const pendingClaim = claimsQuery.data?.find((c) => c.orgId === id && c.status === "pending");

  const claim = useMutation({
    mutationFn: () =>
      requestClaim({
        orgId: org!.id,
        orgName: org!.name,
        requesterUid: user!.uid,
        requesterName: user!.displayName ?? user!.email ?? "Utilisateur",
        justification: justification.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userClaims", user?.uid] });
      notify("Demande envoyée — en attente de validation par un administrateur.", "success");
      setShowForm(false);
      setJustification("");
    },
    onError: () => notify("Impossible d'envoyer la demande.", "error"),
  });

  if (orgQuery.isLoading) {
    return <div className="container-page py-16"><LoadingState /></div>;
  }
  if (!org) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Structure introuvable" noIndex />
        <EmptyState title="Structure introuvable" message="Cette page n'existe pas ou a été retirée." />
      </div>
    );
  }

  const isImported = org.source === "imported";
  const isUnclaimed = org.claimStatus !== "claimed";
  const canClaim = !!user && isImported && isUnclaimed && org.ownerUid !== user.uid;

  return (
    <div className="container-page py-6">
      <SEOHead title={org.name} description={org.description || `${org.name} — structure de santé`} />

      <div className="card-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold">{org.name}</h1>
                {isImported && isUnclaimed && <Badge tone="warning">Non réclamée</Badge>}
                {org.claimStatus === "claimed" && (
                  <Badge tone="green">
                    <BadgeCheck className="h-3.5 w-3.5" /> Gérée
                  </Badge>
                )}
              </div>
              {org.address && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4" /> {org.address}
                </p>
              )}
              {org.rating != null && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {org.rating.toFixed(1)}
                </p>
              )}
            </div>
          </div>
          {org.coords && <DirectionsButton to={org.coords} className="sm:w-auto" />}
        </div>

        {org.description && (
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">{org.description}</p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {canClaim && (
            <SectionCard title="Vous gérez cette structure ?">
              {pendingClaim ? (
                <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-text-secondary">
                  Votre demande est en cours d'examen par notre équipe.
                </p>
              ) : showForm ? (
                <div className="space-y-3">
                  <p className="text-sm text-text-secondary">
                    Expliquez votre fonction au sein de la structure. Un administrateur validera
                    votre demande avant de vous attribuer la gestion de la page.
                  </p>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={3}
                    placeholder="Ex. Je suis le responsable administratif de cet établissement…"
                    className="w-full rounded-xl border border-border-soft bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                    <Button
                      onClick={() => claim.mutate()}
                      disabled={claim.isPending || justification.trim().length < 10}
                    >
                      {claim.isPending ? "Envoi…" : "Envoyer la demande"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowForm(true)}>
                  <ShieldQuestion className="h-4 w-4" /> Je gère cette structure
                </Button>
              )}
            </SectionCard>
          )}

          <SectionCard title="Informations pratiques">
            <ul className="space-y-2 text-sm text-text-secondary">
              {org.phone && (
                <li className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4" /> {org.phone}
                </li>
              )}
              {org.hours && (
                <li className="inline-flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" /> {org.hours}
                </li>
              )}
              {org.region && (
                <li className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {org.city ? `${org.city}, ` : ""}{org.region}
                </li>
              )}
            </ul>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          {org.coords && (
            <SectionCard title="Localisation">
              <LazyMapView
                className="h-48 w-full"
                markers={[{ id: org.id, coords: org.coords, title: org.name }]}
                zoom={15}
              />
              <div className="mt-3">
                <DirectionsButton to={org.coords} />
              </div>
            </SectionCard>
          )}
        </aside>
      </div>
    </div>
  );
}

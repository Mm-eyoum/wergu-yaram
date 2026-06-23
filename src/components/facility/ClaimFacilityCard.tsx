import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Mail, Phone, ShieldQuestion } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormInput";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { requestClaim, fetchUserClaims } from "@/services/claims";

/**
 * "Je gère cet établissement" — claim flow for an imported, unclaimed facility.
 * Renders nothing unless the signed-in user can claim it. On success a pending
 * claim request is created for an admin to validate.
 */
export function ClaimFacilityCard({ slug, name }: { slug: string; name: string }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [role, setRole] = useState("");
  const [proEmail, setProEmail] = useState("");
  const [proPhone, setProPhone] = useState("");
  const [details, setDetails] = useState("");
  const [showForm, setShowForm] = useState(false);

  const composedJustification = [
    `Fonction : ${role.trim()}`,
    proEmail.trim() && `Email professionnel : ${proEmail.trim()}`,
    proPhone.trim() && `Téléphone : ${proPhone.trim()}`,
    details.trim() && `Précisions : ${details.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
  const canSubmit = role.trim().length >= 2 && (proEmail.trim() !== "" || proPhone.trim() !== "");

  const claimsQuery = useQuery({
    queryKey: ["userClaims", user?.uid],
    queryFn: () => fetchUserClaims(user!.uid),
    enabled: !!user,
  });
  const pendingClaim = claimsQuery.data?.find(
    (c) => (c.facilitySlug ?? c.orgId) === slug && c.status === "pending",
  );

  const claim = useMutation({
    mutationFn: () =>
      requestClaim({
        facilitySlug: slug,
        facilityName: name,
        requesterUid: user!.uid,
        requesterName: user!.displayName ?? user!.email ?? "Utilisateur",
        justification: composedJustification,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userClaims", user?.uid] });
      notify("Demande envoyée — en attente de validation par un administrateur.", "success");
      setShowForm(false);
      setRole("");
      setProEmail("");
      setProPhone("");
      setDetails("");
    },
    onError: () => notify("Impossible d'envoyer la demande.", "error"),
  });

  if (!user) return null;

  return (
    <SectionCard title="Vous gérez cet établissement ?">
      {pendingClaim ? (
        <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-text-secondary">
          Votre demande est en cours d'examen par notre équipe.
        </p>
      ) : showForm ? (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Renseignez votre fonction et un moyen de vérification. Un administrateur validera
            votre demande avant de vous attribuer la gestion de la fiche.
          </p>
          <FormInput
            label="Votre fonction au sein de l'établissement"
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Ex. Directeur, responsable administratif…"
            leftIcon={<Briefcase className="h-4 w-4" />}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput
              label="Email professionnel"
              type="email"
              value={proEmail}
              onChange={(e) => setProEmail(e.target.value)}
              placeholder="vous@etablissement.sn"
              leftIcon={<Mail className="h-4 w-4" />}
              autoComplete="email"
            />
            <FormInput
              label="Téléphone"
              type="tel"
              value={proPhone}
              onChange={(e) => setProPhone(e.target.value)}
              placeholder="+221 …"
              leftIcon={<Phone className="h-4 w-4" />}
              autoComplete="tel"
            />
          </div>
          <div>
            <label htmlFor="claim-details" className="mb-1.5 block text-sm font-medium text-text-primary">
              Précisions / justificatif <span className="text-text-secondary">(facultatif)</span>
            </label>
            <textarea
              id="claim-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Tout élément utile pour vérifier votre rattachement à l'établissement."
              className="w-full rounded-xl border border-border-soft bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />
          </div>
          <p className="text-xs text-text-secondary">
            Indiquez au moins un email professionnel ou un téléphone pour la vérification.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={() => claim.mutate()} disabled={claim.isPending || !canSubmit}>
              {claim.isPending ? "Envoi…" : "Envoyer la demande"}
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)}>
          <ShieldQuestion className="h-4 w-4" /> Je gère cet établissement
        </Button>
      )}
    </SectionCard>
  );
}

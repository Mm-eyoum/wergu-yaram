import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, ShieldCheck } from "lucide-react";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  requestProfessionalVerification,
  fetchUserVerificationRequests,
} from "@/services/professionalVerification";
import { SEOHead } from "@/seo/SEOHead";

/**
 * Demande du statut « professionnel de santé vérifié ». L'utilisateur soumet un
 * justificatif ; un admin approuve (→ rôle `health_pro` + badge). Aucun pouvoir
 * d'administration n'est accordé.
 */
export default function ProfessionalVerification() {
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const uid = user?.uid;

  const [justification, setJustification] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialties, setSpecialties] = useState("");

  const requests = useQuery({
    queryKey: ["verificationRequests", uid],
    queryFn: () => fetchUserVerificationRequests(uid!),
    enabled: !!uid,
  });

  const pending = requests.data?.find((r) => r.status === "pending");
  const alreadyPro = user?.role === "health_pro";

  const submit = useMutation({
    mutationFn: () =>
      requestProfessionalVerification({
        requesterUid: uid!,
        requesterName: user?.displayName ?? "Professionnel",
        requesterEmail: user?.email ?? "",
        justification,
        licenseNumber: licenseNumber.trim() || undefined,
        specialties: specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verificationRequests", uid] });
      setJustification("");
      setLicenseNumber("");
      setSpecialties("");
      notify("Demande envoyée — notre équipe vous recontacte après vérification.", "success");
    },
    onError: (e) => notify(e instanceof Error ? e.message : "Envoi impossible.", "error"),
  });

  return (
    <div className="container-page max-w-2xl py-8">
      <SEOHead title="Devenir professionnel vérifié" noIndex />
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-green">
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>

      <header className="mb-6 flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">Professionnel de santé vérifié</h1>
          <p className="text-sm text-text-secondary">
            Faites vérifier votre statut pour afficher un badge de confiance sur vos contributions
            (forum, communautés). Aucune fonction d'administration n'est accordée.
          </p>
        </div>
      </header>

      {alreadyPro ? (
        <div className="card-surface flex items-center gap-3 p-6">
          <BadgeCheck className="h-6 w-6 text-brand-green" />
          <p className="font-semibold text-text-primary">
            Votre compte est déjà vérifié « Professionnel de santé ». Merci !
          </p>
        </div>
      ) : requests.isLoading ? (
        <LoadingState />
      ) : pending ? (
        <div className="card-surface p-6">
          <Badge tone="warning">Demande en cours d'examen</Badge>
          <p className="mt-3 text-sm text-text-secondary">
            Votre demande a bien été reçue et sera examinée par notre équipe. Vous serez notifié·e
            de la décision.
          </p>
          {pending.justification && (
            <p className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-sm text-text-secondary">
              {pending.justification}
            </p>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (justification.trim().length < 1) {
              notify("Merci de décrire votre qualification.", "error");
              return;
            }
            submit.mutate();
          }}
          className="card-surface space-y-5 p-6"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Justificatif <span className="text-danger">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={5}
              placeholder="Ordre professionnel, diplôme, structure de rattachement, fonction…"
              className="w-full rounded-xl border border-border-soft bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />
          </div>
          <FormInput
            label="Numéro d'ordre / licence (optionnel)"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />
          <FormInput
            label="Spécialités (séparées par des virgules)"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder="Médecine générale, Cardiologie…"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? "Envoi…" : "Envoyer ma demande"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

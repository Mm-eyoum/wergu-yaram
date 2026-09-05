import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormInput";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { joinTenant } from "@/services/memberships";

/**
 * Public membership ("adhérer") form for a partner space (e.g. a mutuelle).
 * Creates a pending membership; the partner manages status/cotisation. Recurring
 * payment reuses the Bictorys rail (activation step).
 */
export function PartnerJoinForm({
  tenantSlug,
  cotisationLabel,
  accent,
}: {
  tenantSlug: string;
  cotisationLabel?: string;
  accent?: string;
}) {
  const { notify } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [done, setDone] = useState(false);

  const join = useMutation({
    mutationFn: () => joinTenant({ tenantSlug, name, email, phone, uid: user?.uid }),
    onSuccess: () => { setDone(true); notify("Demande d'adhésion envoyée ✓", "success"); },
    onError: () => notify("Envoi impossible. Réessayez.", "error"),
  });

  if (done) {
    return (
      <div className="card-surface p-6 text-center">
        <p className="text-lg font-bold text-text-primary">Bienvenue !</p>
        <p className="mt-1 text-sm text-text-secondary">Votre demande d'adhésion a été transmise. Le partenaire vous recontactera.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!name.trim() || !email.trim()) { notify("Nom et email requis.", "error"); return; } join.mutate(); }}
      className="card-surface space-y-4 p-6"
    >
      {cotisationLabel && (
        <p className="rounded-xl bg-brand-mint px-3 py-2 text-sm text-text-secondary">
          Cotisation : <b className="text-text-primary">{cotisationLabel}</b>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput label="Nom" required value={name} onChange={(e) => setName(e.target.value)} />
        <FormInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <FormInput label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 …" />
      <div className="flex justify-end">
        <Button type="submit" disabled={join.isPending} style={accent ? { backgroundColor: accent } : undefined}>
          <UserPlus className="h-4 w-4" /> {join.isPending ? "Envoi…" : "Adhérer"}
        </Button>
      </div>
    </form>
  );
}

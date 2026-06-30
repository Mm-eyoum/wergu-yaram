import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormInput";
import { useToast } from "@/hooks/useToast";
import { submitLead } from "@/services/leads";
import type { LeadKind } from "@/types/domain";

const KIND_LABELS: Record<LeadKind, string> = {
  contact: "Prise de contact",
  demo: "Demande de démo",
  candidature: "Candidature",
};

/**
 * Public lead-capture form embedded on a partner space. Captures contact / demo /
 * application requests → the partner's `leads` (visible in their management area).
 */
export function PartnerLeadForm({
  tenantSlug,
  accent,
  kinds = ["contact", "demo", "candidature"],
}: {
  tenantSlug: string;
  accent?: string;
  kinds?: LeadKind[];
}) {
  const { notify } = useToast();
  const [kind, setKind] = useState<LeadKind>(kinds[0] ?? "contact");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const send = useMutation({
    mutationFn: () => submitLead({ tenantSlug, kind, name, email, phone, message }),
    onSuccess: () => {
      setDone(true);
      notify("Message envoyé ✓ — le partenaire vous recontactera.", "success");
    },
    onError: () => notify("Envoi impossible. Réessayez.", "error"),
  });

  const accentBg = accent ? { backgroundColor: accent } : undefined;

  if (done) {
    return (
      <div className="card-surface p-6 text-center">
        <p className="text-lg font-bold text-text-primary">Merci !</p>
        <p className="mt-1 text-sm text-text-secondary">Votre demande a bien été transmise au partenaire.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
          notify("Nom et email requis.", "error");
          return;
        }
        send.mutate();
      }}
      className="card-surface space-y-4 p-6"
    >
      {kinds.length > 1 && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Objet</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as LeadKind)}
            className="h-11 w-full rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none"
          >
            {kinds.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
          </select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput label="Nom" required value={name} onChange={(e) => setName(e.target.value)} />
        <FormInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <FormInput label="Téléphone (optionnel)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 …" />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={3000}
          placeholder="Votre demande…"
          className="w-full rounded-xl border border-border-soft bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={send.isPending} style={accentBg}>
          <Send className="h-4 w-4" /> {send.isPending ? "Envoi…" : "Envoyer"}
        </Button>
      </div>
    </form>
  );
}

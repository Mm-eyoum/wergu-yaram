import { BadgeCheck, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

type Kind = "verified" | "medical" | "community";

const config = {
  verified: { label: "Contenu vérifié", icon: <BadgeCheck className="h-3.5 w-3.5" />, tone: "green" as const },
  medical: { label: "Médicament vérifié", icon: <ShieldCheck className="h-3.5 w-3.5" />, tone: "green" as const },
  community: { label: "Retour d'expérience", icon: <Users className="h-3.5 w-3.5" />, tone: "navy" as const },
};

/** Trust marker distinguishing verified medical vs community content. */
export function TrustBadge({ kind = "verified", label }: { kind?: Kind; label?: string }) {
  const c = config[kind];
  return (
    <Badge tone={c.tone} icon={c.icon}>
      {label ?? c.label}
    </Badge>
  );
}

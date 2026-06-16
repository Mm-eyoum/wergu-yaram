import { Building2, HandHeart, Handshake } from "lucide-react";
import type { OrganizationType } from "@/types/domain";
import { cn } from "@/lib/cn";

/**
 * Picker for the kind of "page" a base user creates (Facebook/LinkedIn model).
 * Used by the page-creation flow — NOT by registration (every account is a patient).
 */
const ORG_TYPES: { value: OrganizationType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "healthcare_facility", label: "Structure de santé", icon: <Building2 className="h-5 w-5" />, desc: "Hôpital, clinique, centre de santé" },
  { value: "partner", label: "Partenaire", icon: <Handshake className="h-5 w-5" />, desc: "ONG, institution, entreprise" },
  { value: "partner_donor", label: "Donateur", icon: <HandHeart className="h-5 w-5" />, desc: "Soutenir des besoins d'équipement" },
];

interface OrgTypeSelectorProps {
  value: OrganizationType | null;
  onChange: (type: OrganizationType) => void;
}

export function OrgTypeSelector({ value, onChange }: OrgTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {ORG_TYPES.map((type) => {
        const active = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-colors",
              active
                ? "border-brand-green bg-brand-green/10"
                : "border-border-soft hover:border-brand-teal",
            )}
          >
            <span className={cn("text-brand-green", active && "scale-110 transition-transform")}>
              {type.icon}
            </span>
            <span className="text-sm font-semibold text-text-primary">{type.label}</span>
            <span className="text-[11px] leading-tight text-text-secondary">{type.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

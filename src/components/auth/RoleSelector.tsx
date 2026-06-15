import { Building2, HandHeart, Handshake, User } from "lucide-react";
import type { Role } from "@/types/domain";
import { cn } from "@/lib/cn";

const ROLES: { value: Role; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "patient_public", label: "Patient", icon: <User className="h-5 w-5" />, desc: "Rechercher et s'informer" },
  { value: "healthcare_facility", label: "Structure", icon: <Building2 className="h-5 w-5" />, desc: "Établissement de santé" },
  { value: "partner", label: "Partenaire", icon: <Handshake className="h-5 w-5" />, desc: "Organisation partenaire" },
  { value: "partner_donor", label: "Donateur", icon: <HandHeart className="h-5 w-5" />, desc: "Soutenir des besoins" },
];

interface RoleSelectorProps {
  value: Role;
  onChange: (role: Role) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ROLES.map((role) => {
        const active = value === role.value;
        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(role.value)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-colors",
              active
                ? "border-brand-green bg-brand-green/10"
                : "border-border-soft hover:border-brand-teal",
            )}
          >
            <span className={cn("text-brand-green", active && "scale-110 transition-transform")}>
              {role.icon}
            </span>
            <span className="text-sm font-semibold text-text-primary">{role.label}</span>
            <span className="text-[11px] leading-tight text-text-secondary">{role.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

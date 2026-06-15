import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { HEALTH_INTERESTS } from "@/lib/constants";

interface InterestSelectorProps {
  value: string[];
  onChange: (interests: string[]) => void;
}

export function InterestSelector({ value, onChange }: InterestSelectorProps) {
  function toggle(interest: string) {
    onChange(
      value.includes(interest) ? value.filter((i) => i !== interest) : [...value, interest],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {HEALTH_INTERESTS.map((interest) => {
        const active = value.includes(interest);
        return (
          <button
            key={interest}
            type="button"
            onClick={() => toggle(interest)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-brand-green bg-brand-green text-white"
                : "border-border-soft text-text-secondary hover:border-brand-teal",
            )}
          >
            {active && <Check className="h-3.5 w-3.5" />}
            {interest}
          </button>
        );
      })}
    </div>
  );
}

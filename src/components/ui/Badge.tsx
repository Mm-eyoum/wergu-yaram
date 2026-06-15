import { cn } from "@/lib/cn";

type Tone = "green" | "navy" | "mint" | "neutral" | "danger" | "warning" | "outline";

const tones: Record<Tone, string> = {
  green: "bg-brand-green/10 text-brand-green",
  navy: "bg-brand-navy/10 text-brand-navy",
  mint: "bg-brand-mint text-brand-green",
  neutral: "bg-slate-100 text-text-secondary",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/15 text-[#9a6512]",
  outline: "border border-border-soft text-text-secondary",
};

interface BadgeProps {
  tone?: Tone;
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Badge({ tone = "neutral", className, icon, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

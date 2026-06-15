import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  tone?: "green" | "navy";
  size?: "sm" | "md";
}

export function ProgressBar({ value, className, tone = "green", size = "md" }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-slate-100",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all",
          tone === "green" ? "bg-brand-gradient" : "bg-brand-navy",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

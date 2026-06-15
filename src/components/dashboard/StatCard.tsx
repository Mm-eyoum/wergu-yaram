import { cn } from "@/lib/cn";

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  className?: string;
}

export function StatCard({ icon, value, label, className }: StatCardProps) {
  return (
    <div className={cn("card-surface flex items-center gap-3 p-4", className)}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
        {icon}
      </span>
      <div>
        <p className="text-xl font-extrabold text-text-primary">{value}</p>
        <p className="text-xs text-text-secondary">{label}</p>
      </div>
    </div>
  );
}

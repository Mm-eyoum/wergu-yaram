import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

interface CategoryPillProps {
  label: string;
  to?: string;
  active?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}

const cls = (active?: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
    active
      ? "border-brand-green bg-brand-green text-white"
      : "border-border-soft bg-white text-text-secondary hover:border-brand-teal hover:text-brand-green",
  );

/** Rounded selectable chip — used for shortcuts, filters and quick categories. */
export function CategoryPill({ label, to, active, icon, onClick }: CategoryPillProps) {
  if (to) {
    return (
      <Link to={to} className={cls(active)}>
        {icon}
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls(active)}>
      {icon}
      {label}
    </button>
  );
}

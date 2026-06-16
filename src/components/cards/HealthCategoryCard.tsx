import { Link } from "react-router-dom";
import { cardInteractive } from "./primitives";

interface HealthCategoryCardProps {
  label: string;
  to: string;
  icon: React.ReactNode;
}

/** Quick health category tile (home "Catégories de santé" grid). */
export function HealthCategoryCard({ label, to, icon }: HealthCategoryCardProps) {
  return (
    <Link to={to} className={`${cardInteractive} flex flex-col items-center gap-2 p-4 text-center hover:border-brand-teal`}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-mint text-brand-green transition-colors group-hover:bg-brand-green group-hover:text-white motion-reduce:transition-none">
        {icon}
      </span>
      <span className="text-sm font-semibold text-text-primary group-hover:text-brand-green">{label}</span>
    </Link>
  );
}

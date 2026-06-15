import { Link } from "react-router-dom";

interface HealthCategoryCardProps {
  label: string;
  to: string;
  icon: React.ReactNode;
}

/** Quick health category tile (home "Catégories de santé" grid). */
export function HealthCategoryCard({ label, to, icon }: HealthCategoryCardProps) {
  return (
    <Link
      to={to}
      className="card-surface group flex flex-col items-center gap-2 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-brand-teal hover:shadow-card"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-mint text-brand-green transition-colors group-hover:bg-brand-green group-hover:text-white">
        {icon}
      </span>
      <span className="text-sm font-semibold text-text-primary">{label}</span>
    </Link>
  );
}

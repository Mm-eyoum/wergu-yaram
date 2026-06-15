import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm text-text-secondary">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
            {item.to && !last ? (
              <Link to={item.to} className="hover:text-brand-green">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "font-medium text-text-primary" : undefined}>{item.label}</span>
            )}
            {!last && <ChevronRight className="h-3.5 w-3.5 text-text-secondary/60" />}
          </span>
        );
      })}
    </nav>
  );
}

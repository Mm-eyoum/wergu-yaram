import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

interface SidebarPanelProps {
  title: string;
  icon?: React.ReactNode;
  action?: { label: string; to: string };
  className?: string;
  children: React.ReactNode;
}

/** Contextual right/left sidebar block with a header and optional "see all". */
export function SidebarPanel({ title, icon, action, className, children }: SidebarPanelProps) {
  return (
    <section className={cn("card-surface p-5", className)}>
      <header className="mb-3.5 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          {icon && <span className="text-brand-green">{icon}</span>}
          {title}
        </h3>
        {action && (
          <Link
            to={action.to}
            className="text-xs font-semibold text-brand-green hover:underline"
          >
            {action.label}
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

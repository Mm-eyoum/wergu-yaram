import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padded?: boolean;
}

/** Base rounded surface used across the app. */
export function Card({ hoverable, padded = true, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border-soft bg-surface-card shadow-soft",
        padded && "p-5",
        hoverable && "transition-all hover:-translate-y-0.5 hover:shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface SectionCardProps {
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/** Card with a titled header + icon — the main content section pattern. */
export function SectionCard({ title, icon, action, id, className, children }: SectionCardProps) {
  return (
    <section id={id} className={cn("card-surface p-6", className)}>
      {title && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-text-primary">
            {icon && (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-mint text-brand-green">
                {icon}
              </span>
            )}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

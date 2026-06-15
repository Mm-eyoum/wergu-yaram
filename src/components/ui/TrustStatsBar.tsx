import { cn } from "@/lib/cn";

export interface Stat {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface TrustStatsBarProps {
  title?: string;
  subtitle?: string;
  stats: Stat[];
  className?: string;
  variant?: "navy" | "light";
}

/** Statistics strip used to build trust ("Une plateforme de confiance"). */
export function TrustStatsBar({
  title,
  subtitle,
  stats,
  className,
  variant = "navy",
}: TrustStatsBarProps) {
  const dark = variant === "navy";
  return (
    <section
      className={cn(
        "rounded-3xl px-6 py-8 sm:px-10",
        dark ? "bg-brand-navy text-white" : "card-surface",
        className,
      )}
    >
      {(title || subtitle) && (
        <div className="mb-6 text-center">
          {title && <h2 className={cn("text-xl font-bold", dark && "text-white")}>{title}</h2>}
          {subtitle && (
            <p className={cn("mt-1 text-sm", dark ? "text-white/70" : "text-text-secondary")}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            {stat.icon && (
              <div
                className={cn(
                  "mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl",
                  dark ? "bg-white/10 text-brand-teal" : "bg-brand-mint text-brand-green",
                )}
              >
                {stat.icon}
              </div>
            )}
            <dd className={cn("text-2xl font-extrabold", dark ? "text-brand-teal" : "text-brand-green")}>
              {stat.value}
            </dd>
            <dt className={cn("mt-0.5 text-xs", dark ? "text-white/70" : "text-text-secondary")}>
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

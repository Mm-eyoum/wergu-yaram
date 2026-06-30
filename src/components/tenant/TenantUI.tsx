import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CountUpStat } from "@/components/ui/CountUpStat";
import { accentTheme } from "@/lib/tenantTheme";
import type { TenantCta } from "@/lib/tenantCta";
import type { TenantCommittee } from "@/types/domain";

/** Adaptive CTA rendered as a router Link or external anchor. */
export function TenantCtaLink({
  cta,
  style,
  className,
  onClick,
}: {
  cta: TenantCta;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      {cta.label} <ArrowRight className="h-4 w-4" />
    </>
  );
  if (cta.href) {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className={className} style={style} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <Link to={cta.to ?? "/"} className={className} style={style} onClick={onClick}>
      {content}
    </Link>
  );
}

/** Section heading: accent icon chip + title (+ optional count and "see all"). */
export function SectionHeading({
  icon,
  title,
  count,
  accent,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  accent?: string;
  action?: { label: string; to: string };
}) {
  const theme = accentTheme(accent);
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={theme.chip}>
          {icon}
        </span>
        <h2 className="text-lg font-bold text-text-primary sm:text-xl">{title}</h2>
        {typeof count === "number" && count > 0 && (
          <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={theme.chip}>
            {count}
          </span>
        )}
      </div>
      {action && (
        <Link to={action.to} className="inline-flex items-center gap-1 text-sm font-semibold" style={theme.text}>
          {action.label} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/** Compact accent-tinted page header for tenant sub-pages. */
export function TenantPageHeader({
  title,
  subtitle,
  accent,
  icon,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  icon?: React.ReactNode;
}) {
  const theme = accentTheme(accent);
  return (
    <header className="rounded-3xl border border-border-soft p-6 sm:p-8" style={{ backgroundColor: theme.softer }}>
      <div className="flex items-center gap-3">
        {icon && (
          <span className="grid h-11 w-11 place-items-center rounded-2xl" style={theme.chip}>
            {icon}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

/** A committee member card (avatar + name + role + org). */
export function MemberCard({ member }: { member: TenantCommittee["members"][number] }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border-soft bg-white p-3 shadow-soft">
      <Avatar name={member.name} size="md" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-text-primary">{member.name}</p>
        {(member.role || member.org) && (
          <p className="truncate text-xs text-text-secondary">
            {[member.role, member.org].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

/** Governance block: committee mission, impact indicators, member cards. */
export function GovernancePanel({ committee, accent }: { committee: TenantCommittee; accent?: string }) {
  const theme = accentTheme(accent);
  return (
    <div className="card-surface p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Gouvernance</p>
      <h3 className="mt-1 text-lg font-bold text-text-primary">{committee.name}</h3>
      {committee.mission && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">{committee.mission}</p>}

      {committee.indicators.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {committee.indicators.map((i) => (
            <CountUpStat key={i.label} label={i.label} value={i.value} accent={theme.solid} />
          ))}
        </div>
      )}

      {committee.members.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {committee.members.map((m) => (
            <MemberCard key={m.name} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Closing accent CTA band — the space's primary action. */
export function SupportBand({ cta, name, accent }: { cta: TenantCta; name: string; accent?: string }) {
  const theme = accentTheme(accent);
  return (
    <section
      className="relative overflow-hidden rounded-3xl p-8 text-center text-white sm:p-12"
      style={{ backgroundImage: `linear-gradient(135deg, ${theme.solid} 0%, #0B1F49 140%)` }}
    >
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Sparkles className="h-9 w-9 text-white/90" />
        <h2 className="text-2xl font-bold">Agir avec {name}</h2>
        <p className="max-w-xl text-sm text-white/85">
          Rejoignez le mouvement et soutenez des actions de santé à impact concret, près de chez vous.
        </p>
        <TenantCtaLink
          cta={cta}
          className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold shadow-soft transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          style={theme.text}
        />
      </div>
    </section>
  );
}

/** Warm inline placeholder for an empty section (not a hard EmptyState). */
export function EmptyHint({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-soft bg-surface-mint/40 p-6 text-center text-sm text-text-secondary">
      {message}
    </div>
  );
}

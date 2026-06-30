import { Link } from "react-router-dom";
import { Store } from "lucide-react";
import { useTenants } from "@/hooks/useCatalog";

/** Resolve a tenant slug → partner name (from the cached tenants list). */
export function usePartnerName(slug?: string): string | undefined {
  const { data: tenants = [] } = useTenants();
  if (!slug) return undefined;
  return tenants.find((t) => t.slug === slug)?.name;
}

/**
 * "Proposé par [Partenaire]" attribution shown wherever partner-created content
 * surfaces on the main domain — links the content back to its partner space.
 * Renders nothing for global editorial content (no `tenantSlug`).
 *
 * `asLink=false` (default) renders plain text — use INSIDE cards that are already
 * a `<Link>` (nested anchors are invalid). Detail pages pass `asLink`.
 */
export function PartnerAttribution({
  tenantSlug,
  asLink = false,
  className = "",
}: {
  tenantSlug?: string;
  asLink?: boolean;
  className?: string;
}) {
  const name = usePartnerName(tenantSlug);
  if (!tenantSlug || !name) return null;

  const base = `inline-flex items-center gap-1 text-xs text-text-secondary ${className}`;
  const inner = (
    <>
      <Store className="h-3.5 w-3.5 shrink-0" /> Proposé par <b className="font-semibold">{name}</b>
    </>
  );
  return asLink ? (
    <Link to={`/partenaires/${tenantSlug}`} className={`${base} transition-colors hover:text-brand-green`}>
      {inner}
    </Link>
  ) : (
    <span className={base}>{inner}</span>
  );
}

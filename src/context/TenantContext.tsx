import { useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { TenantContext } from "./tenant";
import { resolveTenantSlug } from "@/lib/tenantHost";
import { getTenantBySlug } from "@/services/catalog";

/**
 * Resolves the active partner space from the host (or `?tenant=`/`VITE_TENANT`),
 * loads its config, and applies a light theme accent (`--tenant-accent`). On the
 * main portal host, `tenant` stays null and nothing changes.
 *
 * The lookup shares the React Query cache key `["tenant", slug]` with
 * `PartnerProfile`, so the partner space renders without a second Firestore read.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const slug = useMemo(() => resolveTenantSlug(), []);

  const tenantQuery = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => getTenantBySlug(slug ?? undefined),
    enabled: !!slug,
  });
  const tenant = tenantQuery.data ?? null;
  const loading = !!slug && tenantQuery.isLoading;

  useEffect(() => {
    const root = document.documentElement;
    if (tenant?.theme?.accent) root.style.setProperty("--tenant-accent", tenant.theme.accent);
    else root.style.removeProperty("--tenant-accent");
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ tenant, loading, slug }}>{children}</TenantContext.Provider>
  );
}

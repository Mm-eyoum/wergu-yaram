import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TenantContext } from "./tenant";
import { resolveTenantSlug } from "@/lib/tenantHost";
import { getTenantBySlug } from "@/services/catalog";
import type { Tenant } from "@/types/domain";

/**
 * Resolves the active partner space from the host (or `?tenant=`/`VITE_TENANT`),
 * loads its config, and applies a light theme accent (`--tenant-accent`). On the
 * main portal host, `tenant` stays null and nothing changes.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const slug = useMemo(() => resolveTenantSlug(), []);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(slug));

  useEffect(() => {
    let active = true;
    if (!slug) {
      setTenant(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getTenantBySlug(slug)
      .then((t) => active && (setTenant(t), setLoading(false)))
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    const root = document.documentElement;
    if (tenant?.theme?.accent) root.style.setProperty("--tenant-accent", tenant.theme.accent);
    else root.style.removeProperty("--tenant-accent");
  }, [tenant]);

  return <TenantContext.Provider value={{ tenant, loading }}>{children}</TenantContext.Provider>;
}

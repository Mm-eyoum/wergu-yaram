import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRedirects } from "@/hooks/useSiteConfig";

/**
 * Applies admin-configured client-side redirects. On every navigation it looks
 * for an exact `from === pathname` rule and replaces the location with `to`.
 * Renders nothing.
 */
export function RedirectHandler() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data } = useRedirects();

  useEffect(() => {
    const rule = data?.rules.find((r) => r.from === pathname);
    if (rule?.to && rule.to !== pathname) navigate(rule.to, { replace: true });
  }, [pathname, data, navigate]);

  return null;
}

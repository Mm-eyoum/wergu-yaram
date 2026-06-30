import { Globe, HandHeart, Info, MapPin } from "lucide-react";
import { TenantPageHeader, GovernancePanel } from "@/components/tenant/TenantUI";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCommunities } from "@/hooks/useCatalog";
import { accentTheme } from "@/lib/tenantTheme";
import { SEOHead } from "@/seo/SEOHead";

export default function TenantAbout() {
  const { tenant, slug } = useTenant();
  const { data: communities = [] } = useTenantCommunities(slug ?? undefined);
  const accent = tenant?.theme?.accent;
  const theme = accentTheme(accent);
  const committee = tenant?.committee;
  const memberTotal = communities.reduce((n, c) => n + (c.membersCount || 0), 0);

  const repere = [
    tenant?.website && { label: "Site officiel", value: tenant.website, icon: <Globe className="h-4 w-4" /> },
    communities.length > 0 && { label: "Communautés", value: `${communities.length}`, icon: <HandHeart className="h-4 w-4" /> },
    memberTotal > 0 && { label: "Membres réunis", value: memberTotal.toLocaleString("fr-FR"), icon: <MapPin className="h-4 w-4" /> },
  ].filter(Boolean) as { label: string; value: string; icon: React.ReactNode }[];

  return (
    <div className="container-page space-y-8 py-8">
      <SEOHead title={`À propos — ${tenant?.name ?? "Espace partenaire"}`} description={tenant?.description} />
      <TenantPageHeader title={`À propos de ${tenant?.name ?? "l'espace"}`} accent={accent} icon={<Info className="h-5 w-5" />} />

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="card-surface p-6 sm:p-8">
          <h2 className="text-lg font-bold text-text-primary">Notre mission</h2>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-text-secondary">
            {tenant?.description || "Ce partenaire présentera bientôt sa mission et ses actions."}
          </p>
          {tenant?.website && (
            <a
              href={tenant.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={theme.button}
            >
              <Globe className="h-4 w-4" /> Site officiel
            </a>
          )}
        </div>

        {repere.length > 0 && (
          <aside className="card-surface h-fit p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Repères</p>
            <dl className="mt-3 space-y-3">
              {repere.map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={theme.chip}>
                    {r.icon}
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-text-secondary">{r.label}</dt>
                    <dd className="truncate text-sm font-semibold text-text-primary">{r.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </section>

      {committee && <GovernancePanel committee={committee} accent={accent} />}
    </div>
  );
}

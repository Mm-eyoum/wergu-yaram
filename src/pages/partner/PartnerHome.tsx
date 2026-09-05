import { Link, useParams } from "react-router-dom";
import { ArrowRight, Download, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { fetchTenantForManager } from "@/services/tenants";
import { useTenantAnalytics, useTenantTraffic } from "@/hooks/useCatalog";
import { PARTNER_NAV } from "@/components/partner/partnerNav";
import { exportCsv } from "@/lib/exportCsv";
import { SEOHead } from "@/seo/SEOHead";

const xof = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " XOF";
const num = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) + " %" : "—");

/** Partner dashboard — real analytics (Firestore) + quick navigation + CSV export. */
export default function PartnerHome() {
  const { slug } = useParams();
  const base = `/espace/${slug}/gestion`;
  const { data: tenant } = useQuery({
    queryKey: ["partner", "tenant", slug],
    queryFn: () => fetchTenantForManager(slug!),
    enabled: !!slug,
  });
  const analytics = useTenantAnalytics(slug);
  const traffic = useTenantTraffic(slug);
  const accent = { color: "var(--tenant-accent, #007A5E)" };
  const a = analytics.data;
  const t = traffic.data;

  const tiles: { label: string; value: string }[] = a
    ? [
        { label: "Vues de l'espace", value: num(a.views) },
        { label: "Communautés", value: num(a.communities) },
        { label: "Membres cumulés", value: num(a.members) },
        { label: "Publications", value: num(a.posts) },
        { label: "Événements", value: num(a.events) },
        { label: "Articles", value: num(a.articles) },
        { label: "Formations", value: num(a.formations) },
        { label: "Besoins", value: num(a.needs) },
        { label: "Fonds collectés", value: xof(a.raised) },
        { label: "Donateurs", value: num(a.donors) },
        { label: "Campagnes envoyées", value: num(a.campaignSent) },
        { label: "Taux de livraison", value: pct(a.campaignSent, a.campaignTargeted) },
      ]
    : [];

  function handleExport() {
    if (!a) return;
    exportCsv(`impact-${slug}`, [
      { indicateur: "Vues de l'espace", valeur: a.views },
      { indicateur: "Communautés", valeur: a.communities },
      { indicateur: "Membres cumulés", valeur: a.members },
      { indicateur: "Publications", valeur: a.posts },
      { indicateur: "Événements", valeur: a.events },
      { indicateur: "Articles", valeur: a.articles },
      { indicateur: "Formations", valeur: a.formations },
      { indicateur: "Besoins d'équipement", valeur: a.needs },
      { indicateur: "Fonds collectés (XOF)", valeur: a.raised },
      { indicateur: "Objectif (XOF)", valeur: a.target },
      { indicateur: "Donateurs", valeur: a.donors },
      { indicateur: "Campagnes", valeur: a.campaigns },
      { indicateur: "Messages envoyés", valeur: a.campaignSent },
      { indicateur: "Messages ciblés", valeur: a.campaignTargeted },
    ]);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <SEOHead title="Tableau de bord partenaire" noIndex />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Espace partenaire</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl" style={accent}>{tenant?.name ?? slug}</h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-white/60">Vos indicateurs d'impact, en temps réel.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!a}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </header>

      {analytics.isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-border-soft bg-white p-4 dark:bg-white/5">
              <p className="text-xl font-extrabold" style={accent}>{t.value}</p>
              <p className="mt-0.5 text-xs text-text-secondary">{t.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Trafic réel GA4 (si configuré côté ops) */}
      {t?.configured && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-bold text-text-primary dark:text-white">Trafic (30 derniers jours)</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border-soft bg-white p-4 dark:bg-white/5">
              <p className="text-xl font-extrabold" style={accent}>{num(t.views ?? 0)}</p>
              <p className="mt-0.5 text-xs text-text-secondary">Vues de pages</p>
            </div>
            <div className="rounded-2xl border border-border-soft bg-white p-4 dark:bg-white/5">
              <p className="text-xl font-extrabold" style={accent}>{num(t.users ?? 0)}</p>
              <p className="mt-0.5 text-xs text-text-secondary">Visiteurs</p>
            </div>
            <div className="rounded-2xl border border-border-soft bg-white p-4 dark:bg-white/5">
              <p className="text-xl font-extrabold" style={accent}>{num(t.sessions ?? 0)}</p>
              <p className="mt-0.5 text-xs text-text-secondary">Sessions</p>
            </div>
          </div>
        </>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold text-text-primary dark:text-white">Gérer</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {PARTNER_NAV.filter((n) => n.key !== "home").map((item) => (
          <Link
            key={item.key}
            to={item.segment ? `${base}/${item.segment}` : base}
            className="card-surface group flex items-center gap-3 p-4 transition hover:shadow-card dark:bg-white/5"
          >
            <item.icon className="h-5 w-5" style={accent} />
            <span className="min-w-0 flex-1 font-semibold text-text-primary dark:text-white">{item.label}</span>
            <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

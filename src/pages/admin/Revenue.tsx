import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, TrendingUp, HandCoins, Receipt, Percent, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchRecentTransactions, fetchMrr, summarizeTransactions } from "@/services/billing";
import type { LineOfBusiness, TxnType } from "@/types/domain";
import { formatFcfa } from "@/lib/format";
import { SEOHead } from "@/seo/SEOHead";

const LINE_LABELS: Record<LineOfBusiness, string> = {
  donations: "Dons",
  pages: "Pages structures",
  events: "Billetterie",
  content: "Contenu / sponsoring",
  data: "Données / B2B",
};

const TYPE_LABELS: Record<TxnType, string> = {
  donation: "Don",
  donation_tip: "Don + pourboire",
  subscription: "Abonnement",
  ticket: "Billet",
  commission: "Commission",
  refund: "Remboursement",
  payout: "Reversement",
  sponsorship: "Sponsoring",
};

function formatStamp(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-white/60">
        <Icon className="h-4 w-4 text-brand-green" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-text-primary dark:text-white">{value}</div>
    </div>
  );
}

/**
 * Admin revenue dashboard. Reads the unified `transactions` registry and
 * aggregates client-side (GMV, platform revenue, take rate, per-line breakdown).
 * A scheduled `aggregateRevenue` Function can later pre-compute `revenueReports`
 * for larger volumes — this page is the read MVP.
 */
export default function Revenue() {
  const query = useQuery({
    queryKey: ["admin", "revenue", "transactions"],
    queryFn: () => fetchRecentTransactions(500),
  });

  const mrrQuery = useQuery({
    queryKey: ["admin", "revenue", "mrr"],
    queryFn: fetchMrr,
  });

  const summary = useMemo(
    () => summarizeTransactions(query.data ?? []),
    [query.data],
  );

  return (
    <div className="mx-auto max-w-5xl">
      <SEOHead title="Revenus" noIndex />
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Revenus</h1>
          <p className="text-sm text-text-secondary dark:text-white/60">
            Synthèse des transactions (dons, pourboires, abonnements, billetterie).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser
        </Button>
      </header>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={query.refetch} />
      ) : summary.transactionsCount === 0 ? (
        <EmptyState
          title="Aucune transaction"
          message="Les revenus apparaîtront ici dès le premier paiement réussi (Bictorys)."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard label="GMV (volume)" value={formatFcfa(summary.gmv)} icon={TrendingUp} />
            <StatCard label="Revenu plateforme" value={formatFcfa(summary.platformRevenue)} icon={HandCoins} />
            <StatCard
              label="MRR (abonnements)"
              value={mrrQuery.data ? formatFcfa(mrrQuery.data.mrr) : "—"}
              icon={Repeat}
            />
            <StatCard
              label="Take rate"
              value={`${(summary.takeRate * 100).toFixed(1)} %`}
              icon={Percent}
            />
            <StatCard label="Transactions" value={String(summary.transactionsCount)} icon={Receipt} />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-text-primary dark:text-white">
            Par ligne de business
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-brand-soft text-left text-xs uppercase tracking-wide text-text-secondary dark:border-white/10 dark:bg-white/5">
                  <th className="px-4 py-3 font-semibold">Ligne</th>
                  <th className="px-4 py-3 font-semibold">GMV</th>
                  <th className="px-4 py-3 font-semibold">Revenu plateforme</th>
                  <th className="px-4 py-3 font-semibold">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.byLine).map(([line, agg]) => (
                  <tr key={line} className="border-b border-black/5 last:border-0 dark:border-white/5">
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-white">
                      {LINE_LABELS[line as LineOfBusiness] ?? line}
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-white/70">{formatFcfa(agg.gmv)}</td>
                    <td className="px-4 py-3 text-text-secondary dark:text-white/70">{formatFcfa(agg.platformRevenue)}</td>
                    <td className="px-4 py-3 text-text-secondary dark:text-white/70">{agg.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-text-primary dark:text-white">
            Transactions récentes
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-brand-soft text-left text-xs uppercase tracking-wide text-text-secondary dark:border-white/10 dark:bg-white/5">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Montant</th>
                  <th className="px-4 py-3 font-semibold">Plateforme</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {(query.data ?? []).slice(0, 50).map((t) => (
                  <tr key={t.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary dark:text-white/60">
                      {formatStamp(t.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-text-primary dark:text-white">
                      {TYPE_LABELS[t.type] ?? t.type}
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-white/70">{formatFcfa(t.amount)}</td>
                    <td className="px-4 py-3 text-text-secondary dark:text-white/70">{formatFcfa(t.platformAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={t.status === "completed" ? "green" : t.status === "failed" ? "danger" : "neutral"}>
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

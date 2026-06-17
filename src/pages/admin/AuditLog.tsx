import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchAuditLogs, type AuditAction } from "@/services/audit";
import { SEOHead } from "@/seo/SEOHead";

const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  publish: "Publication",
  unpublish: "Dépublication",
  status_change: "Changement de statut",
  role_change: "Changement de rôle",
  approve: "Approbation",
  reject: "Rejet",
};

const ACTION_TONE: Record<AuditAction, "green" | "navy" | "danger" | "warning" | "neutral"> = {
  create: "green",
  update: "navy",
  delete: "danger",
  publish: "green",
  unpublish: "warning",
  status_change: "navy",
  role_change: "warning",
  approve: "green",
  reject: "danger",
};

function formatStamp(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function AuditLog() {
  const [action, setAction] = useState<AuditAction | "">("");
  const [max, setMax] = useState(100);
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["admin", "audit", action || "all", max],
    queryFn: () => fetchAuditLogs({ action: action || undefined, max }),
  });

  const rows = useMemo(() => {
    const all = query.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((e) =>
      [e.actorName, e.resourceTitle, e.resourceType, e.resourceId].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [query.data, search]);

  return (
    <div className="mx-auto max-w-5xl">
      <SEOHead title="Journal d'audit" noIndex />
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Journal d'audit</h1>
          <p className="text-sm text-text-secondary dark:text-white/60">
            Historique des actions d'administration (lecture seule).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as AuditAction | "")}
          className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="">Toutes les actions</option>
          {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </select>
        <div className="relative ml-auto max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par acteur, ressource…"
            className="w-full rounded-xl border border-black/10 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={query.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="Aucune entrée" message="Aucune action ne correspond à ces filtres." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-brand-soft text-left text-xs uppercase tracking-wide text-text-secondary dark:border-white/10 dark:bg-white/5">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Acteur</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Ressource</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary dark:text-white/60">{formatStamp(e.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-white">{e.actorName ?? e.actorUid.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={ACTION_TONE[e.action]}>{ACTION_LABELS[e.action] ?? e.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-white/70">
                      <span className="font-medium text-text-primary dark:text-white/90">{e.resourceType}</span>
                      {e.resourceTitle ? ` · ${e.resourceTitle}` : ` · ${e.resourceId}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data && query.data.length >= max && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={() => setMax((m) => m + 100)} disabled={query.isFetching}>
                Charger plus
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

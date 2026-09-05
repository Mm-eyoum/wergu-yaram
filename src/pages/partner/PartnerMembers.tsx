import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/useToast";
import { fetchTenantMembers, setMemberStatus } from "@/services/memberships";
import { exportCsv } from "@/lib/exportCsv";
import type { MembershipStatus } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

const STATUS: Record<MembershipStatus, { label: string; tone: "green" | "warning" | "navy" }> = {
  active: { label: "À jour", tone: "green" },
  pending: { label: "En attente", tone: "warning" },
  lapsed: { label: "Échue", tone: "navy" },
};

/** Partner management — members/adherents of the space (mutuelles, associations). */
export default function PartnerMembers() {
  const { slug } = useParams();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const key = ["partner", "members", slug] as const;

  const list = useQuery({ queryKey: key, queryFn: () => fetchTenantMembers(slug!), enabled: !!slug });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MembershipStatus }) => setMemberStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); notify("Statut mis à jour ✓", "success"); },
    onError: () => notify("Action impossible.", "error"),
  });

  function handleExport() {
    exportCsv(`membres-${slug}`, (list.data ?? []).map((m) => ({
      date: m.createdAt ?? "", nom: m.name, email: m.email, telephone: m.phone ?? "", statut: m.status ?? "",
    })));
  }

  const counts = (list.data ?? []).reduce(
    (acc, m) => { acc[m.status ?? "pending"]++; return acc; },
    { active: 0, pending: 0, lapsed: 0 } as Record<MembershipStatus, number>,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Membres" noIndex />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Membres</h1>
          <p className="text-sm text-text-secondary dark:text-white/60">
            {list.data?.length ?? 0} adhérent(s) · {counts.active} à jour · {counts.pending} en attente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => list.refetch()} disabled={list.isFetching}>
            <RefreshCw className={list.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!list.data?.length}>Export CSV</Button>
        </div>
      </header>

      {list.isLoading ? (
        <LoadingState />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState title="Aucun membre" message="Les adhésions reçues depuis votre espace apparaîtront ici (activez la cotisation dans les paramètres)." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-brand-soft text-left text-xs uppercase tracking-wide text-text-secondary dark:border-white/10 dark:bg-white/5">
                <th className="px-4 py-3 font-semibold">Membre</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.data!.map((m) => (
                <tr key={m.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary dark:text-white">{m.name}</p>
                    <p className="flex flex-wrap gap-3 text-xs text-text-secondary">
                      <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 hover:text-brand-green"><Mail className="h-3.5 w-3.5" /> {m.email}</a>
                      {m.phone && <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 hover:text-brand-green"><Phone className="h-3.5 w-3.5" /> {m.phone}</a>}
                    </p>
                  </td>
                  <td className="px-4 py-3"><Badge tone={STATUS[m.status ?? "pending"].tone}>{STATUS[m.status ?? "pending"].label}</Badge></td>
                  <td className="px-4 py-3">
                    <select
                      value={m.status ?? "pending"}
                      onChange={(e) => update.mutate({ id: m.id, status: e.target.value as MembershipStatus })}
                      className="rounded-lg border border-border-soft bg-white px-2 py-1 text-xs focus:border-brand-teal focus:outline-none"
                    >
                      <option value="pending">En attente</option>
                      <option value="active">À jour</option>
                      <option value="lapsed">Échue</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

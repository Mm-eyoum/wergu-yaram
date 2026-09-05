import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormInput } from "@/components/ui/FormInput";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/useToast";
import { fetchTenantCampaigns, startCampaign } from "@/services/campaigns";
import { fetchTenantForManager } from "@/services/tenants";
import { SENEGAL_REGIONS } from "@/lib/constants";
import type { CampaignChannel } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

const CHANNEL_LABELS: Record<CampaignChannel, string> = { sms: "SMS", whatsapp: "WhatsApp" };

/** Self-service campaigns scoped to the partner's space (audience = consenting
 * users interested in the space's communities; monthly quota enforced server-side). */
export default function PartnerCampaigns() {
  const { slug } = useParams();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("whatsapp");
  const [message, setMessage] = useState("");
  const [region, setRegion] = useState("");

  const tenant = useQuery({
    queryKey: ["partner", "tenant", slug],
    queryFn: () => fetchTenantForManager(slug!),
    enabled: !!slug,
  });
  const list = useQuery({
    queryKey: ["partner", "campaigns", slug],
    queryFn: () => fetchTenantCampaigns(slug!),
    enabled: !!slug,
  });

  const quota = tenant.data?.campaignQuota;
  const remaining =
    quota && quota.periodKey
      ? Math.max(0, quota.monthly - quota.sentThisMonth)
      : undefined;

  const launch = useMutation({
    mutationFn: () =>
      startCampaign({
        title: title.trim(),
        channel,
        message: message.trim(),
        segment: { region: region || undefined },
        tenantSlug: slug,
      }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["partner", "campaigns", slug] });
      queryClient.invalidateQueries({ queryKey: ["partner", "tenant", slug] });
      setTitle("");
      setMessage("");
      notify(`Campagne lancée : ${r.sent}/${r.targeted} destinataire(s).`, "success");
    },
    onError: (e) => notify(e instanceof Error ? e.message : "Envoi impossible.", "error"),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Campagnes de l'espace" noIndex />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Campagnes</h1>
          <p className="text-sm text-text-secondary dark:text-white/60">
            SMS / WhatsApp vers les membres <b>consentants</b> intéressés par vos communautés.
            {remaining !== undefined && <> Quota restant ce mois : <b>{remaining}</b>.</>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => list.refetch()} disabled={list.isFetching}>
          <RefreshCw className={list.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser
        </Button>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !message.trim()) { notify("Titre et message requis.", "error"); return; }
          launch.mutate();
        }}
        className="card-surface space-y-4 p-6"
      >
        <FormInput label="Titre (interne)" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Canal</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as CampaignChannel)} className="h-11 w-full rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none">
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Région (optionnel)</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="h-11 w-full rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none">
              <option value="">Toutes</option>
              {SENEGAL_REGIONS.slice(1).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={600}
            placeholder="Message de prévention court et actionnable…"
            className="w-full rounded-xl border border-border-soft bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
          />
          <p className="mt-1 text-xs text-text-secondary">
            WhatsApp : hors fenêtre 24 h, un <b>template approuvé</b> par Meta est requis.
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={launch.isPending || remaining === 0}>
            <Send className="h-4 w-4" /> {launch.isPending ? "Envoi…" : "Lancer la campagne"}
          </Button>
        </div>
      </form>

      <h2 className="mb-3 mt-8 text-lg font-bold text-text-primary dark:text-white">Historique</h2>
      {list.isLoading ? (
        <LoadingState />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState title="Aucune campagne" message="Vos campagnes envoyées apparaîtront ici." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-brand-soft text-left text-xs uppercase tracking-wide text-text-secondary dark:border-white/10 dark:bg-white/5">
                <th className="px-4 py-3 font-semibold">Titre</th>
                <th className="px-4 py-3 font-semibold">Canal</th>
                <th className="px-4 py-3 font-semibold">Ciblé</th>
                <th className="px-4 py-3 font-semibold">Envoyé</th>
              </tr>
            </thead>
            <tbody>
              {list.data!.map((c) => (
                <tr key={c.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-4 py-3 font-medium text-text-primary dark:text-white">{c.title}</td>
                  <td className="px-4 py-3"><Badge tone="navy">{CHANNEL_LABELS[c.channel]}</Badge></td>
                  <td className="px-4 py-3 text-text-secondary">{c.targetedCount ?? 0}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.sentCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

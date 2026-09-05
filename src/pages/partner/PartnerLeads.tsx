import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchTenantLeads } from "@/services/leads";
import { exportCsv } from "@/lib/exportCsv";
import type { LeadKind } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

const KIND_LABELS: Record<LeadKind, string> = {
  contact: "Contact",
  demo: "Démo",
  candidature: "Candidature",
};

/** Partner management — prospects captured from the space's lead form. */
export default function PartnerLeads() {
  const { slug } = useParams();
  const list = useQuery({
    queryKey: ["partner", "leads", slug],
    queryFn: () => fetchTenantLeads(slug!),
    enabled: !!slug,
  });

  function handleExport() {
    exportCsv(`prospects-${slug}`, (list.data ?? []).map((l) => ({
      date: l.createdAt ?? "",
      objet: KIND_LABELS[l.kind],
      nom: l.name,
      email: l.email,
      telephone: l.phone ?? "",
      message: l.message ?? "",
    })));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Prospects" noIndex />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Prospects</h1>
          <p className="text-sm text-text-secondary dark:text-white/60">
            Demandes reçues via le formulaire de votre espace (contact, démo, candidature).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => list.refetch()} disabled={list.isFetching}>
            <RefreshCw className={list.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!list.data?.length}>
            Export CSV
          </Button>
        </div>
      </header>

      {list.isLoading ? (
        <LoadingState />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState title="Aucun prospect" message="Les demandes reçues depuis votre espace apparaîtront ici." />
      ) : (
        <div className="space-y-3">
          {list.data!.map((l) => (
            <div key={l.id} className="card-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary dark:text-white">{l.name}</span>
                  <Badge tone="navy">{KIND_LABELS[l.kind]}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                  <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 hover:text-brand-green">
                    <Mail className="h-3.5 w-3.5" /> {l.email}
                  </a>
                  {l.phone && (
                    <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 hover:text-brand-green">
                      <Phone className="h-3.5 w-3.5" /> {l.phone}
                    </a>
                  )}
                </div>
              </div>
              {l.message && <p className="mt-2 text-sm text-text-secondary">{l.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

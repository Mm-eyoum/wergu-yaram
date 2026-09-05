import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, HandHeart, HeartHandshake, Receipt, Sparkles } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useUserDonations } from "@/hooks/useDashboardData";
import { useEquipmentNeeds } from "@/hooks/useCatalog";
import { summarizeDonations } from "@/services/billing";
import { formatDate, formatFcfa } from "@/lib/format";
import { SEOHead } from "@/seo/SEOHead";

/** « Mes dons & impact » — historique des dons de l'utilisateur + impact agrégé. */
export default function MyDonations() {
  const { user } = useAuth();
  const donations = useUserDonations(user?.uid);
  const { data: needs = [] } = useEquipmentNeeds();

  const needTitle = useMemo(() => {
    const map = new Map(needs.map((n) => [n.id, n]));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [needs]);

  const txns = donations.data ?? [];
  const summary = summarizeDonations(txns);

  return (
    <div className="container-page max-w-3xl py-8">
      <SEOHead title="Mes dons & impact" noIndex />
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-green">
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>

      <header className="mb-6 flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
          <HeartHandshake className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">Mes dons &amp; impact</h1>
          <p className="text-sm text-text-secondary">Merci pour votre générosité — voici l'impact de vos dons.</p>
        </div>
      </header>

      {donations.isLoading ? (
        <LoadingState label="Chargement de vos dons…" />
      ) : txns.length === 0 ? (
        <EmptyState
          title="Aucun don pour l'instant"
          message="Soutenez une campagne d'équipement et suivez votre impact ici."
          action={<ButtonLink to="/besoins" size="sm">Voir les besoins</ButtonLink>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard icon={<HandHeart className="h-5 w-5" />} value={formatFcfa(summary.total)} label="Total donné" />
            <StatCard icon={<Sparkles className="h-5 w-5" />} value={summary.campaigns} label="Campagnes soutenues" />
            <StatCard icon={<Receipt className="h-5 w-5" />} value={summary.count} label="Dons effectués" />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-text-primary">Historique</h2>
          <ul className="space-y-3">
            {txns.map((t) => {
              const need = needTitle(t.refId);
              return (
                <li key={t.id} className="card-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      {need ? (
                        <Link to={`/besoins/${need.id}`} className="font-bold text-text-primary hover:text-brand-green">
                          {need.title}
                        </Link>
                      ) : (
                        <p className="font-bold text-text-primary">Don</p>
                      )}
                      <p className="text-xs text-text-secondary">{formatDate(t.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-brand-green">{formatFcfa(t.amount)}</p>
                      {t.platformAmount > 0 && (
                        <p className="text-[11px] text-text-secondary">dont {formatFcfa(t.platformAmount)} de pourboire</p>
                      )}
                    </div>
                  </div>
                  {need?.impact?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {need.impact.slice(0, 3).map((i) => (
                        <Badge key={i} tone="mint">{i}</Badge>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

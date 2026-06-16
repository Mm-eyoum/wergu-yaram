import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, FileClock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";
import { usePendingOrganizations, adminKeys } from "@/hooks/useAdminData";
import { fetchPendingClaims } from "@/services/claims";
import { usePermission } from "@/components/admin/PermissionGate";
import { ADMIN_NAV } from "@/components/admin/adminNav";
import { ROLE_LABELS } from "@/lib/constants";
import { SEOHead } from "@/seo/SEOHead";

export default function AdminHome() {
  const { user } = useAuth();
  const canModerate = usePermission("moderation");

  const pendingOrgs = usePendingOrganizations(canModerate);
  const claims = useQuery({
    queryKey: adminKeys.pendingClaims,
    queryFn: fetchPendingClaims,
    enabled: canModerate,
  });

  const quickLinks = ADMIN_NAV.filter(
    (item) => item.ready && item.key !== "dashboard" && can(user?.role, item.permission),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <SEOHead title="Administration" noIndex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">
          Bonjour {user?.displayName?.split(" ")[0] ?? ""} 👋
        </h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          Espace {user ? ROLE_LABELS[user.role] : ""} — gérez la plateforme Wergu Yaram.
        </p>
      </header>

      {canModerate && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <StatCard
            to="/admin/moderation"
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Pages à valider"
            value={pendingOrgs.data?.length ?? "—"}
          />
          <StatCard
            to="/admin/moderation"
            icon={<FileClock className="h-5 w-5" />}
            label="Réclamations en attente"
            value={claims.data?.length ?? "—"}
          />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary dark:text-white/50">
          Accès rapide
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.to}
                className="card-surface group flex items-center gap-3 p-4 transition hover:shadow-card dark:bg-white/5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green dark:bg-white/10">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 font-semibold text-text-primary dark:text-white">
                  {item.label}
                </span>
                <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  to,
  icon,
  label,
  value,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Link to={to} className="card-surface flex items-center gap-4 p-5 transition hover:shadow-card dark:bg-white/5">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-mint text-brand-green dark:bg-white/10">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-extrabold text-text-primary dark:text-white">{value}</p>
        <p className="text-sm text-text-secondary dark:text-white/60">{label}</p>
      </div>
    </Link>
  );
}

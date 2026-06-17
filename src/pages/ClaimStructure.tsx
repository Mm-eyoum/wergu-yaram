import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, Search, Send, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { FormInput } from "@/components/ui/FormInput";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { fetchActiveOrganizationsByType } from "@/services/organizations";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

const STEPS = [
  {
    icon: <Search className="h-5 w-5" />,
    title: "1. Trouvez votre structure",
    text: "Recherchez la structure de santé que vous gérez parmi les pages déjà référencées.",
  },
  {
    icon: <Send className="h-5 w-5" />,
    title: "2. Envoyez votre demande",
    text: "Indiquez votre fonction et un moyen de vérification (email pro, téléphone).",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "3. Validation par un admin",
    text: "Notre équipe vérifie votre demande puis vous attribue la gestion de la page.",
  },
];

export default function ClaimStructure() {
  const [query, setQuery] = useState("");
  const { data: orgs, isLoading, isError } = useQuery({
    queryKey: ["organizations", "active", "healthcare_facility"],
    queryFn: () => fetchActiveOrganizationsByType("healthcare_facility"),
  });

  // Only imported pages with no owner can be claimed.
  const claimable = useMemo(() => {
    const list = (orgs ?? []).filter(
      (o) => o.source === "imported" && o.claimStatus !== "claimed",
    );
    const q = query.trim().toLowerCase();
    return q
      ? list.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            (o.city ?? "").toLowerCase().includes(q) ||
            (o.region ?? "").toLowerCase().includes(q),
        )
      : list;
  }, [orgs, query]);

  return (
    <div className="container-page py-10">
      <SEOHead
        title="Réclamer votre structure de santé"
        description="Vous gérez une structure de santé déjà référencée sur Wergu Yaram ? Réclamez sa page et gérez ses informations et ses besoins."
        canonicalPath="/structures/revendiquer"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Structures", path: "/structures" },
          { name: "Réclamer", path: "/structures/revendiquer" },
        ])}
      />

      <header className="max-w-2xl">
        <Badge tone="mint">
          <Sparkles className="h-3.5 w-3.5" /> Pour les structures de santé
        </Badge>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
          Réclamez la page de <span className="text-brand-green">votre structure</span>
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Gérez les informations, les services et les besoins d'équipement d'une structure
          de santé déjà référencée. La gestion vous est attribuée après validation.
        </p>
      </header>

      {/* How it works */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.title} className="card-surface p-4">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-mint text-brand-green">
              {s.icon}
            </span>
            <h2 className="mt-3 text-sm font-bold text-text-primary">{s.title}</h2>
            <p className="mt-1 text-xs text-text-secondary">{s.text}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mt-8 max-w-md">
        <FormInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une structure (nom, ville…)"
          leftIcon={<Search className="h-4 w-4" />}
          aria-label="Rechercher une structure"
        />
      </div>

      {/* Claimable list */}
      <div className="mt-6">
        {isLoading ? (
          <LoadingState label="Chargement des structures…" />
        ) : isError ? (
          <EmptyState
            title="Structures indisponibles"
            message="Une erreur est survenue lors du chargement. Réessayez plus tard."
          />
        ) : claimable.length === 0 ? (
          <EmptyState
            title="Aucune structure à réclamer"
            message="Aucune structure référencée ne correspond. Si la vôtre n'existe pas encore, créez sa page."
            action={
              <ButtonLink to="/dashboard/pages/new" size="sm">
                Créer une page
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {claimable.map((org) => (
              <div key={org.id} className="card-surface flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-mint text-brand-green">
                    {org.logo ? (
                      <img src={org.logo} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-text-primary">{org.name}</h3>
                    {(org.city || org.region) && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-text-secondary">
                        <MapPin className="h-3.5 w-3.5" /> {org.city || org.region}
                      </p>
                    )}
                  </div>
                  <Badge tone="warning">Non réclamée</Badge>
                </div>
                <ButtonLink to={`/structures/${org.id}`} size="sm" fullWidth className="mt-4">
                  Réclamer cette structure
                </ButtonLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

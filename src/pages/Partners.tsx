import { useMemo, useState } from "react";
import { ArrowRight, Building2, Globe, HandHeart, Users } from "lucide-react";
import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { PartnerCard } from "@/components/cards/PartnerCard";
import { CategoryPill } from "@/components/ui/CategoryPill";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TrustStatsBar } from "@/components/ui/TrustStatsBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { partners } from "@/services/content";
import type { PartnerCategory } from "@/types/domain";

const CATEGORIES: { key: PartnerCategory | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "institution", label: "Institutions" },
  { key: "ong", label: "ONG" },
  { key: "fondation", label: "Fondations" },
  { key: "entreprise", label: "Entreprises" },
  { key: "structure", label: "Structures" },
];

export default function Partners() {
  const [category, setCategory] = useState<PartnerCategory | "all">("all");
  const featured = partners.find((p) => p.featured);

  const filtered = useMemo(
    () => partners.filter((p) => category === "all" || p.category === category),
    [category],
  );

  return (
    <div>
      <UniversalSearchHero
        compact
        showShortcuts={false}
        title={
          <>
            Partenaires de l'<span className="text-brand-green">écosystème santé</span>
          </>
        }
        subtitle="Découvrez les organisations qui soutiennent la santé au Sénégal."
      />

      <div className="container-page space-y-10 py-10">
        <TrustStatsBar
          variant="light"
          stats={[
            { value: "120", label: "Partenaires engagés", icon: <Users className="h-5 w-5" /> },
            { value: "14", label: "Régions couvertes", icon: <Globe className="h-5 w-5" /> },
            { value: "215+", label: "Projets soutenus", icon: <Building2 className="h-5 w-5" /> },
            { value: "2,6Mds", label: "FCFA mobilisés", icon: <HandHeart className="h-5 w-5" /> },
          ]}
        />

        {featured && (
          <section className="overflow-hidden rounded-3xl border border-border-soft bg-mint-fade p-6 sm:p-8">
            <Badge tone="green">Partenaire à la une</Badge>
            <div className="mt-4 grid items-center gap-6 sm:grid-cols-[160px_1fr]">
              <div className="grid h-24 place-items-center rounded-2xl bg-white p-4">
                {featured.logo ? (
                  <img src={featured.logo} alt={featured.name} className="max-h-16 object-contain" />
                ) : (
                  <span className="text-2xl font-bold text-brand-green">{featured.name}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">{featured.name}</h2>
                <p className="mt-1 text-sm text-text-secondary">{featured.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {featured.tags.map((t) => (
                    <Badge key={t} tone="neutral">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat.key}
              label={cat.label}
              active={category === cat.key}
              onClick={() => setCategory(cat.key)}
            />
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Aucun partenaire" message="Aucun partenaire dans cette catégorie pour le moment." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PartnerCard key={p.slug} partner={p} />
            ))}
          </div>
        )}

        {/* Become a partner */}
        <section className="flex flex-col items-center gap-3 rounded-3xl bg-brand-navy p-8 text-center text-white sm:p-10">
          <HandHeart className="h-10 w-10 text-brand-teal" />
          <h2 className="text-2xl font-bold">Devenir partenaire</h2>
          <p className="max-w-xl text-sm text-white/80">
            Rejoignez l'écosystème Wergu Yaram et participez à l'amélioration de la santé des
            populations sénégalaises.
          </p>
          <Button variant="primary" size="lg" className="mt-2">
            Proposer un partenariat <ArrowRight className="h-4 w-4" />
          </Button>
        </section>
      </div>
    </div>
  );
}

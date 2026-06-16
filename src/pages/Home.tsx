import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Baby,
  Brain,
  HandHeart,
  Heart,
  Hospital,
  LocateFixed,
  Pill,
  Salad,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { HealthCategoryCard } from "@/components/cards/HealthCategoryCard";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { FacilityCard } from "@/components/cards/FacilityCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { EquipmentNeedCard } from "@/components/cards/EquipmentNeedCard";
import { TrustStatsBar } from "@/components/ui/TrustStatsBar";
import { ButtonLink } from "@/components/ui/Button";
import {
  useArticles,
  useCommunities,
  useEquipmentNeeds,
  useFacilities,
} from "@/hooks/useCatalog";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineKm } from "@/lib/geo";
import { fetchActiveFacilityOrganizations } from "@/services/organizations";
import { orgToFacilityCard } from "@/lib/orgAdapters";
import { SEOHead } from "@/seo/SEOHead";
import { organizationJsonLd, websiteJsonLd } from "@/seo/jsonld";

const CATEGORIES = [
  { label: "Cardiologie", icon: <Heart className="h-6 w-6" />, to: "/pathologies/hypertension-arterielle" },
  { label: "Diabète", icon: <Activity className="h-6 w-6" />, to: "/pathologies/diabete-type-2" },
  { label: "Respiratoire", icon: <Stethoscope className="h-6 w-6" />, to: "/pathologies/asthme" },
  { label: "Nutrition", icon: <Salad className="h-6 w-6" />, to: "/recherche?q=nutrition" },
  { label: "Santé mentale", icon: <Brain className="h-6 w-6" />, to: "/recherche?q=stress" },
  { label: "Pédiatrie", icon: <Baby className="h-6 w-6" />, to: "/recherche?q=enfant" },
  { label: "Médicaments", icon: <Pill className="h-6 w-6" />, to: "/recherche?type=medicament" },
  { label: "Établissements", icon: <Hospital className="h-6 w-6" />, to: "/recherche?type=etablissement" },
];

const WHY = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Contenus vérifiés",
    text: "Des fiches médicales relues par un comité éditorial, avec sources et dates de mise à jour.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Une communauté solidaire",
    text: "Échangez, posez vos questions et trouvez du soutien auprès de personnes qui vous comprennent.",
  },
  {
    icon: <HandHeart className="h-5 w-5" />,
    title: "Agir concrètement",
    text: "Soutenez les besoins d'équipement des structures de santé près de chez vous.",
  },
];

export default function Home() {
  const { data: articles = [] } = useArticles();
  const { data: communities = [] } = useCommunities();
  const { data: equipmentNeeds = [] } = useEquipmentNeeds();
  const { data: facilities = [] } = useFacilities();
  const { data: orgFacilities = [] } = useQuery({
    queryKey: ["mapFacilityOrgs"],
    queryFn: fetchActiveFacilityOrganizations,
  });
  const geo = useGeolocation();
  const urgentNeeds = equipmentNeeds.filter((n) => n.urgency === "urgent").slice(0, 3);

  // Curated catalog facilities + directory orgs (imported/created), unified.
  const facilityEntries = useMemo(
    () => [
      ...facilities.map((f) => ({
        facility: f,
        coords: f.coords,
        href: undefined as string | undefined,
        badge: undefined as string | undefined,
      })),
      ...orgFacilities.map((o) => {
        const { facility, href, badge } = orgToFacilityCard(o);
        return { facility, coords: o.coords!, href, badge };
      }),
    ],
    [facilities, orgFacilities],
  );

  // When the user shares their position, surface the closest facilities first.
  const nearbyFacilities = useMemo(() => {
    const withD = facilityEntries.map((e) => ({
      ...e,
      d: geo.position ? haversineKm(geo.position, e.coords) : undefined,
    }));
    if (geo.position) withD.sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
    return withD.slice(0, 2);
  }, [facilityEntries, geo.position]);

  return (
    <>
      <SEOHead
        title="Wergu Yaram — Portail santé du Sénégal"
        bareTitle
        canonicalPath="/"
        jsonLd={[organizationJsonLd(), websiteJsonLd()]}
      />
      <UniversalSearchHero />

      <div className="container-page space-y-14 py-14">
        {/* Categories + articles + facilities */}
        <section className="grid gap-8 lg:grid-cols-[1.1fr_1.4fr_1fr]">
          <div>
            <SectionHeading title="Catégories de santé" to="/recherche" />
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <HealthCategoryCard key={cat.label} {...cat} />
              ))}
            </div>
          </div>

          <div>
            <SectionHeading title="Articles & vidéos recommandés" to="/recherche?type=article" />
            <div className="grid gap-4 sm:grid-cols-2">
              {articles.slice(0, 2).map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </div>

          <div>
            <SectionHeading title="Structures à proximité" to="/carte" />
            {!geo.position && (
              <button
                type="button"
                onClick={geo.request}
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green hover:underline"
              >
                <LocateFixed className="h-4 w-4" /> Trier autour de moi
              </button>
            )}
            <div className="space-y-4">
              {nearbyFacilities.map(({ facility, d, href, badge }) => (
                <FacilityCard key={href ?? facility.slug} facility={facility} distanceKm={d} href={href} badge={badge} />
              ))}
            </div>
          </div>
        </section>

        {/* Communities + urgent needs */}
        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading title="Communautés actives" to="/communautes" />
            <div className="space-y-3">
              {communities.slice(0, 3).map((community) => (
                <CommunityCard key={community.slug} community={community} />
              ))}
            </div>
          </div>

          <div>
            <SectionHeading title="Besoins urgents en équipement" to="/besoins" />
            <div className="grid gap-4 sm:grid-cols-2">
              {urgentNeeds.slice(0, 2).map((need) => (
                <EquipmentNeedCard key={need.id} need={need} />
              ))}
            </div>
          </div>
        </section>

        {/* Why Wergu Yaram */}
        <section className="rounded-3xl bg-mint-fade p-8 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-2xl font-extrabold">Pourquoi Wergu Yaram ?</h2>
              <p className="mt-2 text-text-secondary">
                Un portail santé simple et rassurant : comprendre, s'orienter, échanger et agir,
                au service de tous les Sénégalais.
              </p>
              <ButtonLink to="/inscription" className="mt-5">
                Créer un compte gratuit <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {WHY.map((item) => (
                <div key={item.title} className="card-surface p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green/10 text-brand-green">
                    {item.icon}
                  </span>
                  <h3 className="mt-3 font-bold text-text-primary">{item.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust stats */}
        <TrustStatsBar
          title="Une plateforme de confiance, au service de tous"
          stats={[
            { value: "1,2M+", label: "Informations vérifiées", icon: <ShieldCheck className="h-5 w-5" /> },
            { value: "15 000+", label: "Membres de la communauté", icon: <Users className="h-5 w-5" /> },
            { value: "850+", label: "Structures référencées", icon: <Hospital className="h-5 w-5" /> },
            { value: "320+", label: "Besoins soutenus", icon: <HandHeart className="h-5 w-5" /> },
          ]}
        />
      </div>
    </>
  );
}

function SectionHeading({ title, to }: { title: string; to: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:gap-1.5">
        Voir tout <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

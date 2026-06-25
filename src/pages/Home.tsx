import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { TrustStatsBar, type Stat } from "@/components/ui/TrustStatsBar";
import { ButtonLink } from "@/components/ui/Button";
import {
  useArticles,
  useCommunities,
  useEquipmentNeeds,
  useFacilities,
} from "@/hooks/useCatalog";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { useSiteSettings } from "@/hooks/useSiteConfig";
import { formatCount } from "@/services/stats";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineKm } from "@/lib/geo";
import { SEOHead } from "@/seo/SEOHead";
import { organizationJsonLd, websiteJsonLd } from "@/seo/jsonld";

export default function Home() {
  const { t } = useTranslation("home");
  const CATEGORIES = [
    { label: t("categories.cardiology"), icon: <Heart className="h-6 w-6" />, to: "/pathologies/hypertension-arterielle" },
    { label: t("categories.diabetes"), icon: <Activity className="h-6 w-6" />, to: "/pathologies/diabete-type-2" },
    { label: t("categories.respiratory"), icon: <Stethoscope className="h-6 w-6" />, to: "/pathologies/asthme" },
    { label: t("categories.nutrition"), icon: <Salad className="h-6 w-6" />, to: "/recherche?q=nutrition" },
    { label: t("categories.mentalHealth"), icon: <Brain className="h-6 w-6" />, to: "/recherche?q=stress" },
    { label: t("categories.pediatrics"), icon: <Baby className="h-6 w-6" />, to: "/recherche?q=enfant" },
    { label: t("categories.medications"), icon: <Pill className="h-6 w-6" />, to: "/recherche?type=medicament" },
    { label: t("categories.facilities"), icon: <Hospital className="h-6 w-6" />, to: "/recherche?type=etablissement" },
  ];
  const WHY = [
    { icon: <ShieldCheck className="h-5 w-5" />, title: t("why.verifiedTitle"), text: t("why.verifiedText") },
    { icon: <Users className="h-5 w-5" />, title: t("why.communityTitle"), text: t("why.communityText") },
    { icon: <HandHeart className="h-5 w-5" />, title: t("why.actTitle"), text: t("why.actText") },
  ];
  const { data: articles = [] } = useArticles();
  const { data: communities = [] } = useCommunities();
  const { data: equipmentNeeds = [] } = useEquipmentNeeds();
  const { data: facilities = [] } = useFacilities();
  const geo = useGeolocation();
  const urgentNeeds = equipmentNeeds.filter((n) => n.urgency === "urgent").slice(0, 3);

  // Trust strip: real computed counts + admin-entered figures. Cards with no
  // real value are omitted so the platform never shows an invented number.
  const platformStats = usePlatformStats().data;
  const editableStats = useSiteSettings().data?.stats;
  const trustStats = useMemo<Stat[]>(() => {
    const cards: (Stat | false)[] = [
      editableStats?.verifiedInfo
        ? { value: editableStats.verifiedInfo, label: t("trust.verifiedInfo"), icon: <ShieldCheck className="h-5 w-5" /> }
        : false,
      platformStats?.members != null
        ? { value: formatCount(platformStats.members)!, label: t("trust.members"), icon: <Users className="h-5 w-5" /> }
        : false,
      platformStats?.facilities != null
        ? { value: formatCount(platformStats.facilities)!, label: t("trust.facilities"), icon: <Hospital className="h-5 w-5" /> }
        : false,
      platformStats?.equipmentNeeds != null
        ? { value: formatCount(platformStats.equipmentNeeds)!, label: t("trust.needs"), icon: <HandHeart className="h-5 w-5" /> }
        : false,
    ];
    return cards.filter(Boolean) as Stat[];
  }, [platformStats, editableStats, t]);

  // Every health establishment lives in `facilities` (user-created, imported, editorial).
  const facilityEntries = useMemo(
    () =>
      facilities.map((f) => ({
        facility: f,
        coords: f.coords,
        href: undefined as string | undefined,
        badge: undefined as string | undefined,
      })),
    [facilities],
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
        title={t("seoTitle")}
        bareTitle
        canonicalPath="/"
        jsonLd={[organizationJsonLd(), websiteJsonLd()]}
      />
      <UniversalSearchHero />

      <div className="container-page space-y-14 py-14">
        {/* Categories + articles + facilities */}
        <section className="grid gap-8 lg:grid-cols-[1.1fr_1.4fr_1fr]">
          <div>
            <SectionHeading title={t("sections.categories")} to="/recherche" />
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <HealthCategoryCard key={cat.label} {...cat} />
              ))}
            </div>
          </div>

          <div>
            <SectionHeading title={t("sections.articles")} to="/recherche?type=article" />
            <div className="grid gap-4 sm:grid-cols-2">
              {articles.slice(0, 2).map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </div>

          <div>
            <SectionHeading title={t("sections.nearby")} to="/carte" />
            {!geo.position && (
              <button
                type="button"
                onClick={geo.request}
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green hover:underline"
              >
                <LocateFixed className="h-4 w-4" /> {t("sortNearby")}
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
            <SectionHeading title={t("sections.communities")} to="/communautes" />
            <div className="space-y-3">
              {communities.slice(0, 3).map((community) => (
                <CommunityCard key={community.slug} community={community} />
              ))}
            </div>
          </div>

          <div>
            <SectionHeading title={t("sections.urgentNeeds")} to="/besoins" />
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
              <h2 className="text-2xl font-extrabold">{t("why.title")}</h2>
              <p className="mt-2 text-text-secondary">{t("why.text")}</p>
              <ButtonLink to="/inscription" className="mt-5">
                {t("why.cta")} <ArrowRight className="h-4 w-4" />
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

        {/* Trust stats — only shown when we have real/configured figures */}
        {trustStats.length > 0 && (
          <TrustStatsBar title={t("trust.title")} stats={trustStats} />
        )}
      </div>
    </>
  );
}

function SectionHeading({ title, to }: { title: string; to: string }) {
  const { t } = useTranslation("home");
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:gap-1.5">
        {t("seeAll")} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

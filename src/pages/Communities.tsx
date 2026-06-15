import { UniversalSearchHero } from "@/components/search/UniversalSearchHero";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { communities } from "@/services/content";

export default function Communities() {
  return (
    <div>
      <UniversalSearchHero
        compact
        showShortcuts={false}
        title={
          <>
            Communautés <span className="text-brand-green">santé</span>
          </>
        }
        subtitle="Rejoignez des espaces d'entraide bienveillants autour de votre santé."
      />
      <div className="container-page py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((c) => (
            <CommunityCard key={c.slug} community={c} />
          ))}
        </div>
      </div>
    </div>
  );
}

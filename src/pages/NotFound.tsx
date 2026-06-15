import { ButtonLink } from "@/components/ui/Button";
import { UniversalSearchBar } from "@/components/search/UniversalSearchBar";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="text-6xl font-extrabold text-brand-green">404</span>
      <h1 className="mt-3 text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        La page que vous recherchez n'existe pas ou a été déplacée. Essayez une recherche santé.
      </p>
      <div className="mt-6 w-full max-w-lg">
        <UniversalSearchBar size="hero" />
      </div>
      <ButtonLink to="/" variant="outline" className="mt-5">
        Retour à l'accueil
      </ButtonLink>
    </div>
  );
}

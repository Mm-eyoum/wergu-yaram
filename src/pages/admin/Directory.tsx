import { DirectoryImportPanel } from "@/components/admin/DirectoryImportPanel";
import { SEOHead } from "@/seo/SEOHead";

export default function Directory() {
  return (
    <div className="mx-auto max-w-4xl">
      <SEOHead title="Annuaire — import" noIndex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">
          Annuaire (import)
        </h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          Importez des structures de santé depuis Google Places.
        </p>
      </header>
      <DirectoryImportPanel />
    </div>
  );
}

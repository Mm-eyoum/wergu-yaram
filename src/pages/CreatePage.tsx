import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Building2, MapPin } from "lucide-react";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { OrgTypeSelector } from "@/components/organizations/OrgTypeSelector";
import { LocationPicker, type LocationValue } from "@/components/map/LocationPicker";
import { SENEGAL_REGIONS } from "@/lib/constants";
import {
  CATEGORY_OPTIONS,
  SECTOR_OPTIONS,
  type FacilityCategory,
  type FacilitySector,
} from "@/lib/facilityTaxonomy";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { createOrganization } from "@/services/organizations";
import { createFacilityAsOwner } from "@/services/facilities";
import { auth } from "@/services/firebase";
import type { OrganizationType } from "@/types/domain";
import { SEOHead } from "@/seo/SEOHead";

export default function CreatePage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [type, setType] = useState<OrganizationType | null>(null);
  const [name, setName] = useState("");
  const [region, setRegion] = useState(SENEGAL_REGIONS[1]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LocationValue>({ address: "", city: "", coords: null });
  const [category, setCategory] = useState<FacilityCategory | "">("");
  const [sector, setSector] = useState<FacilitySector | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!type) {
      setError("Choisissez le type de page.");
      return;
    }
    if (!name.trim()) {
      setError("Le nom de la page est obligatoire.");
      return;
    }
    const currentUser = auth?.currentUser;
    if (!currentUser || !user) {
      setError("Vous devez être connecté.");
      return;
    }
    setLoading(true);
    try {
      if (type === "healthcare_facility") {
        // Une structure de santé EST un établissement (collection `facilities`).
        await createFacilityAsOwner(currentUser, {
          name: name.trim(),
          region,
          description: description.trim(),
          address: location.address.trim(),
          city: location.city.trim(),
          coords: location.coords,
          category: category || undefined,
          sector: sector || undefined,
        });
        notify("Établissement créé — en attente de validation par un administrateur.", "success");
      } else {
        // Partenaire / donateur → page (collection `organizations`).
        await createOrganization(currentUser, {
          type,
          name: name.trim(),
          region,
          description: description.trim(),
          address: location.address.trim(),
          city: location.city.trim(),
          coords: location.coords,
        });
        notify("Page créée — en attente de validation par un administrateur.", "success");
      }
      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("configuré")
          ? "Firebase non configuré : impossible de créer la page."
          : "La création de la page a échoué. Réessayez.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page max-w-2xl py-8">
      <SEOHead title="Créer une page" description="Créez une page structure, partenaire ou donateur sur Wergu Yaram." noIndex />

      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-green">
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>

      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <Building2 className="h-6 w-6 text-brand-green" /> Créer une page
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Représentez une structure de santé, un partenaire ou un donateur. Votre page sera publiée
          après validation par notre équipe.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card-surface space-y-5 p-6">
        {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Type de page</p>
          <OrgTypeSelector value={type} onChange={setType} />
        </div>

        <FormInput
          label="Nom de la page"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Hôpital régional de Thiès"
        />

        <div>
          <label htmlFor="org-region" className="mb-1.5 block text-sm font-medium text-text-primary">Région</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <select
              id="org-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="h-11 w-full rounded-xl border border-border-soft bg-white pl-10 pr-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              {SENEGAL_REGIONS.slice(1).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {type === "healthcare_facility" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fac-category" className="mb-1.5 block text-sm font-medium text-text-primary">Catégorie</label>
                <select
                  id="fac-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FacilityCategory | "")}
                  className="h-11 w-full rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                >
                  <option value="">Choisir une catégorie…</option>
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fac-sector" className="mb-1.5 block text-sm font-medium text-text-primary">Secteur</label>
                <select
                  id="fac-sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value as FacilitySector | "")}
                  className="h-11 w-full rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                >
                  <option value="">Choisir un secteur…</option>
                  {SECTOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <LocationPicker
              label="Localisation de l'établissement"
              value={location}
              onChange={setLocation}
            />
          </>
        )}

        <div>
          <label htmlFor="org-description" className="mb-1.5 block text-sm font-medium text-text-primary">Description</label>
          <textarea
            id="org-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Présentez votre structure en quelques phrases…"
            className="w-full rounded-xl border border-border-soft bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
            Annuler
          </Button>
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Création…" : "Créer la page"}
          </Button>
        </div>
      </form>
    </div>
  );
}

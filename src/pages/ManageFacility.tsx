import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { SchemaForm, type ContentFormSchema } from "@/components/admin/fields/SchemaForm";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { dashboardKeys } from "@/hooks/useDashboardData";
import {
  fetchFacilityForOwner,
  updateFacilityAsOwner,
  type FacilityOwnerPatch,
} from "@/services/facilities";
import { CATEGORY_OPTIONS, SECTOR_OPTIONS, LEVEL_OPTIONS } from "@/lib/facilityTaxonomy";
import { SEOHead } from "@/seo/SEOHead";

/**
 * Owner-facing facility editor. Mirrors the admin facilities schema but drops
 * admin-only fields (slug/published/verified/rating/reviews). Saving forces the
 * facility back into review until an admin validates it (see services/facilities).
 */
const OWNER_SCHEMA: ContentFormSchema = {
  groups: [
    {
      title: "Général",
      fields: [
        { name: "name", label: "Nom", type: "text", required: true },
        { name: "category", label: "Catégorie", type: "select", options: CATEGORY_OPTIONS },
        { name: "sector", label: "Secteur", type: "select", options: SECTOR_OPTIONS },
        { name: "level", label: "Niveau (pyramide sanitaire)", type: "select", options: LEVEL_OPTIONS },
        { name: "region", label: "Région", type: "text" },
        { name: "city", label: "Ville", type: "text" },
        { name: "address", label: "Adresse", type: "text" },
        { name: "phone", label: "Téléphone", type: "text" },
        { name: "email", label: "Email", type: "text" },
      ],
    },
    {
      title: "Présentation",
      fields: [
        { name: "cover", label: "Image", type: "image" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "capacity", label: "Capacité", type: "text" },
        { name: "hours", label: "Horaires", type: "text" },
      ],
    },
    {
      title: "Offre",
      fields: [
        { name: "specialties", label: "Spécialités", type: "stringArray" },
        { name: "services", label: "Services", type: "stringArray" },
      ],
    },
    {
      title: "Équipe",
      fields: [
        {
          name: "doctors",
          label: "Médecins",
          type: "repeatable",
          itemLabel: "un médecin",
          fields: [
            { name: "name", label: "Nom", type: "text" },
            { name: "specialty", label: "Spécialité", type: "text" },
          ],
        },
      ],
    },
    {
      title: "Localisation",
      fields: [{ name: "coords", label: "Coordonnées", type: "coords" }],
    },
  ],
};

const OWNER_FIELDS: (keyof FacilityOwnerPatch)[] = [
  "name", "category", "sector", "level", "region", "city", "address", "phone", "email",
  "cover", "description", "capacity", "hours", "specialties", "services", "doctors", "coords",
];

export default function ManageFacility() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const facilityQuery = useQuery({
    queryKey: ["facilityOwner", slug],
    queryFn: () => fetchFacilityForOwner(slug!),
    enabled: !!slug,
  });

  const facility = facilityQuery.data;
  const canManage =
    !!user && !!facility && (facility.ownerUid === user.uid || !!facility.managerUids?.includes(user.uid));

  const [record, setRecord] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (facility) setRecord({ ...facility });
  }, [facility]);

  const save = useMutation({
    mutationFn: () => {
      const patch: FacilityOwnerPatch = {};
      for (const k of OWNER_FIELDS) {
        if (record[k] !== undefined) (patch as Record<string, unknown>)[k] = record[k];
      }
      return updateFacilityAsOwner(slug!, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilityOwner", slug] });
      if (user) queryClient.invalidateQueries({ queryKey: dashboardKeys.facilities(user.uid) });
      notify("Modifications enregistrées — en attente de validation par un administrateur.", "success");
    },
    onError: () => notify("Impossible d'enregistrer les modifications.", "error"),
  });

  if (facilityQuery.isLoading) {
    return <div className="container-page py-16"><LoadingState /></div>;
  }
  if (facilityQuery.isError) {
    return <div className="container-page py-16"><ErrorState onRetry={facilityQuery.refetch} /></div>;
  }
  if (!facility) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Établissement introuvable" noIndex />
        <EmptyState title="Établissement introuvable" message="Cette fiche n'existe pas ou a été supprimée." />
      </div>
    );
  }
  if (!canManage) {
    return (
      <div className="container-page py-16">
        <SEOHead title="Accès réservé" noIndex />
        <EmptyState
          title="Accès réservé"
          message="Vous ne gérez pas cet établissement."
          action={<Link to="/dashboard" className="text-sm font-semibold text-brand-green hover:underline">Retour au tableau de bord</Link>}
        />
      </div>
    );
  }

  const published = facility.published === true;

  return (
    <div className="container-page max-w-2xl py-8">
      <SEOHead title={`Gérer — ${facility.name}`} noIndex />

      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-green">
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>

      <header className="mb-6 flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-mint text-brand-green">
          <Building2 className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold">{facility.name}</h1>
          <p className="text-sm text-text-secondary">Établissement de santé</p>
        </div>
        <Badge tone={published ? "green" : "warning"}>
          {published ? "Publié" : "En attente de validation"}
        </Badge>
      </header>

      {published && (
        <Link
          to={`/etablissements/${facility.slug}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green hover:underline"
        >
          <ExternalLink className="h-4 w-4" /> Voir la page publique
        </Link>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!String(record.name ?? "").trim()) {
            notify("Le nom est obligatoire.", "error");
            return;
          }
          save.mutate();
        }}
        className="space-y-6"
      >
        <SchemaForm schema={OWNER_SCHEMA} value={record} onChange={setRecord} />

        <p className="rounded-xl bg-brand-soft px-3 py-2 text-xs text-text-secondary">
          Vos modifications sont relues par l'équipe Wergu Yaram avant d'être visibles publiquement.
        </p>

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}

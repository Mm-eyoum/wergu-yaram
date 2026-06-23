import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SchemaForm, type ContentFormSchema } from "@/components/admin/fields/SchemaForm";
import { useToast } from "@/hooks/useToast";
import { fetchTenantForManager, updateTenantAsManager, type TenantManagerPatch } from "@/services/tenants";
import { SEOHead } from "@/seo/SEOHead";

type Row = Record<string, unknown>;

/** Editable tenant profile/branding (rules lock ownerUid/campaignQuota). */
const TENANT_SCHEMA: ContentFormSchema = {
  groups: [
    {
      title: "Profil de l'espace",
      fields: [
        { name: "name", label: "Nom", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea" },
        { name: "website", label: "Site web", type: "text" },
        { name: "published", label: "Espace publié", type: "boolean" },
      ],
    },
    {
      title: "Marque",
      fields: [
        { name: "logo", label: "Logo", type: "image" },
        {
          name: "theme",
          label: "Thème",
          type: "object",
          fields: [
            { name: "accent", label: "Couleur d'accent (hex)", type: "text" },
            { name: "banner", label: "Bannière (URL)", type: "text" },
          ],
        },
      ],
    },
  ],
};

const FIELDS: (keyof TenantManagerPatch)[] = ["name", "description", "website", "published", "logo", "theme"];

export default function PartnerSettings() {
  const { slug } = useParams();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [value, setValue] = useState<Row | null>(null);

  const tenant = useQuery({
    queryKey: ["partner", "tenant", slug],
    queryFn: () => fetchTenantForManager(slug!),
    enabled: !!slug,
  });

  useEffect(() => {
    if (tenant.data && value === null) setValue(tenant.data as unknown as Row);
  }, [tenant.data, value]);

  const save = useMutation({
    mutationFn: () => {
      const patch: TenantManagerPatch = {};
      for (const k of FIELDS) {
        if (value && value[k] !== undefined) (patch as Record<string, unknown>)[k] = value[k];
      }
      return updateTenantAsManager(slug!, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner", "tenant", slug] });
      queryClient.invalidateQueries({ queryKey: ["tenant", slug] });
      notify("Espace mis à jour ✓", "success");
    },
    onError: () => notify("Enregistrement impossible.", "error"),
  });

  if (tenant.isLoading) return <LoadingState />;
  if (tenant.isError) return <ErrorState onRetry={tenant.refetch} />;
  if (!value) return <LoadingState />;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <SEOHead title="Paramètres de l'espace" noIndex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">Paramètres</h1>
        <p className="text-sm text-text-secondary dark:text-white/60">Profil et marque de votre espace.</p>
      </header>

      <SchemaForm schema={TENANT_SCHEMA} value={value} onChange={setValue} />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-brand-navy/90">
        <div className="mx-auto flex max-w-3xl items-center justify-end px-4 py-3">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

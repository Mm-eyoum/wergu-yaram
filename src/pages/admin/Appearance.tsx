import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { useAppearance, siteConfigKeys } from "@/hooks/useSiteConfig";
import { DEFAULT_APPEARANCE, type AppearanceConfig } from "@/services/siteConfig";
import { updateAppearance } from "@/services/admin/siteConfigAdmin";
import { ConfigEditor } from "@/components/admin/ConfigEditor";
import { LoadingState } from "@/components/ui/LoadingState";
import type { ContentFormSchema } from "@/components/admin/fields/SchemaForm";
import { SEOHead } from "@/seo/SEOHead";

const SCHEMA: ContentFormSchema = {
  groups: [
    {
      title: "Identité visuelle",
      fields: [
        { name: "logoUrl", label: "Logo", type: "image" },
        { name: "accentColor", label: "Couleur d'accent", type: "text", placeholder: "#007A5E", help: "Utilisée pour la bannière d'annonce." },
      ],
    },
    {
      title: "Bannière d'annonce",
      fields: [
        {
          name: "banner",
          label: "Bannière",
          type: "object",
          fields: [
            { name: "enabled", label: "Afficher la bannière", type: "boolean" },
            { name: "message", label: "Message", type: "text", fullWidth: true },
            { name: "href", label: "Lien (optionnel)", type: "text", fullWidth: true },
          ],
        },
      ],
    },
  ],
};

export default function Appearance() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const query = useAppearance();
  const [value, setValue] = useState<AppearanceConfig | null>(null);

  useEffect(() => {
    if (query.data && value === null) setValue(query.data);
  }, [query.data, value]);

  const save = useMutation({
    mutationFn: (next: AppearanceConfig) => updateAppearance(next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteConfigKeys.appearance });
      notify("Apparence enregistrée ✓", "success");
    },
    onError: () => notify("Enregistrement impossible.", "error"),
  });

  if (!value) return <LoadingState />;

  return (
    <>
      <SEOHead title="Apparence" noIndex />
      <ConfigEditor
        title="Apparence"
        subtitle="Logo, couleur d'accent et bannière d'annonce du site public."
        schema={SCHEMA}
        value={value as unknown as Record<string, unknown>}
        onChange={(next) => setValue(next as unknown as AppearanceConfig)}
        onSave={() => save.mutate(value)}
        onReset={() => setValue(DEFAULT_APPEARANCE)}
        saving={save.isPending}
      />
    </>
  );
}

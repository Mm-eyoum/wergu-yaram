import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { useMenuConfig, siteConfigKeys } from "@/hooks/useSiteConfig";
import { DEFAULT_MENUS, type MenuConfig } from "@/services/siteConfig";
import { updateMenuConfig } from "@/services/admin/siteConfigAdmin";
import { ConfigEditor } from "@/components/admin/ConfigEditor";
import { LoadingState } from "@/components/ui/LoadingState";
import type { ContentFormSchema } from "@/components/admin/fields/SchemaForm";
import { SEOHead } from "@/seo/SEOHead";

const LINK_FIELDS = [
  { name: "label", label: "Libellé", type: "text" as const },
  { name: "href", label: "Lien", type: "text" as const },
];

const SCHEMA: ContentFormSchema = {
  groups: [
    {
      title: "Navigation principale (en-tête)",
      fields: [
        { name: "header", label: "Liens d'en-tête", type: "repeatable", itemLabel: "un lien", fields: LINK_FIELDS },
      ],
    },
    {
      title: "Pied de page",
      fields: [
        {
          name: "footerGroups",
          label: "Colonnes du pied de page",
          type: "repeatable",
          itemLabel: "une colonne",
          fields: [
            { name: "title", label: "Titre de la colonne", type: "text", fullWidth: true },
            { name: "links", label: "Liens", type: "repeatable", itemLabel: "un lien", fields: LINK_FIELDS },
          ],
        },
      ],
    },
  ],
};

export default function Menus() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const query = useMenuConfig();
  const [value, setValue] = useState<MenuConfig | null>(null);

  useEffect(() => {
    if (query.data && value === null) setValue(query.data);
  }, [query.data, value]);

  const save = useMutation({
    mutationFn: (next: MenuConfig) => updateMenuConfig(next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteConfigKeys.menus });
      notify("Menus enregistrés ✓", "success");
    },
    onError: () => notify("Enregistrement impossible.", "error"),
  });

  if (!value) return <LoadingState />;

  return (
    <>
      <SEOHead title="Menus" noIndex />
      <ConfigEditor
        title="Menus de navigation"
        subtitle="Liens de l'en-tête et colonnes du pied de page du site public."
        schema={SCHEMA}
        value={value as unknown as Record<string, unknown>}
        onChange={(next) => setValue(next as unknown as MenuConfig)}
        onSave={() => save.mutate(value)}
        onReset={() => setValue(DEFAULT_MENUS)}
        saving={save.isPending}
      />
    </>
  );
}

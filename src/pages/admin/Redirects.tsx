import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { useRedirects, siteConfigKeys } from "@/hooks/useSiteConfig";
import { DEFAULT_REDIRECTS, type RedirectConfig } from "@/services/siteConfig";
import { updateRedirects } from "@/services/admin/siteConfigAdmin";
import { ConfigEditor } from "@/components/admin/ConfigEditor";
import { LoadingState } from "@/components/ui/LoadingState";
import type { ContentFormSchema } from "@/components/admin/fields/SchemaForm";
import { SEOHead } from "@/seo/SEOHead";

const SCHEMA: ContentFormSchema = {
  groups: [
    {
      title: "Règles de redirection",
      fields: [
        {
          name: "rules",
          label: "Redirections",
          type: "repeatable",
          itemLabel: "une redirection",
          fields: [
            { name: "from", label: "Depuis (ancien chemin)", type: "text", placeholder: "/ancienne-page" },
            { name: "to", label: "Vers (nouveau chemin)", type: "text", placeholder: "/nouvelle-page" },
          ],
        },
      ],
    },
  ],
};

export default function Redirects() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const query = useRedirects();
  const [value, setValue] = useState<RedirectConfig | null>(null);

  useEffect(() => {
    if (query.data && value === null) setValue(query.data);
  }, [query.data, value]);

  const save = useMutation({
    mutationFn: (next: RedirectConfig) => updateRedirects(next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteConfigKeys.redirects });
      notify("Redirections enregistrées ✓", "success");
    },
    onError: () => notify("Enregistrement impossible.", "error"),
  });

  if (!value) return <LoadingState />;

  return (
    <>
      <SEOHead title="Redirections" noIndex />
      <ConfigEditor
        title="Redirections"
        subtitle="Rediriger d'anciens chemins vers de nouveaux (appliqué côté client)."
        schema={SCHEMA}
        value={value as unknown as Record<string, unknown>}
        onChange={(next) => setValue(next as unknown as RedirectConfig)}
        onSave={() => save.mutate(value)}
        onReset={() => setValue(DEFAULT_REDIRECTS)}
        saving={save.isPending}
      />
    </>
  );
}

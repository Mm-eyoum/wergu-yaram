import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { useLegalConfig, siteConfigKeys } from "@/hooks/useSiteConfig";
import { DEFAULT_LEGAL, type LegalConfig } from "@/services/siteConfig";
import { updateLegalConfig } from "@/services/admin/siteConfigAdmin";
import { ConfigEditor } from "@/components/admin/ConfigEditor";
import { LoadingState } from "@/components/ui/LoadingState";
import type { ContentFormSchema } from "@/components/admin/fields/SchemaForm";
import { SEOHead } from "@/seo/SEOHead";

const SCHEMA: ContentFormSchema = {
  groups: [
    {
      title: "Mentions légales",
      fields: [
        { name: "lastUpdated", label: "Dernière mise à jour", type: "text", placeholder: "juin 2026" },
        {
          name: "sections",
          label: "Sections",
          type: "repeatable",
          itemLabel: "une section",
          fields: [
            { name: "title", label: "Titre", type: "text", fullWidth: true },
            { name: "body", label: "Contenu", type: "textarea", fullWidth: true },
          ],
        },
      ],
    },
  ],
};

export default function Legal() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const query = useLegalConfig();
  const [value, setValue] = useState<LegalConfig | null>(null);

  useEffect(() => {
    if (query.data && value === null) setValue(query.data);
  }, [query.data, value]);

  const save = useMutation({
    mutationFn: (next: LegalConfig) => updateLegalConfig(next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteConfigKeys.legal });
      notify("Mentions légales enregistrées ✓", "success");
    },
    onError: () => notify("Enregistrement impossible.", "error"),
  });

  if (!value) return <LoadingState />;

  return (
    <>
      <SEOHead title="Mentions légales" noIndex />
      <ConfigEditor
        title="Mentions légales"
        subtitle="Conditions d'utilisation et confidentialité affichées sur la page publique /conditions."
        schema={SCHEMA}
        value={value as unknown as Record<string, unknown>}
        onChange={(next) => setValue(next as unknown as LegalConfig)}
        onSave={() => save.mutate(value)}
        onReset={() => setValue(DEFAULT_LEGAL)}
        saving={save.isPending}
      />
    </>
  );
}

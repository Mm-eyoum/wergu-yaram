import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { useEmailConfig, siteConfigKeys } from "@/hooks/useSiteConfig";
import { DEFAULT_EMAILS, type EmailConfig } from "@/services/siteConfig";
import { updateEmailConfig } from "@/services/admin/siteConfigAdmin";
import { ConfigEditor } from "@/components/admin/ConfigEditor";
import { LoadingState } from "@/components/ui/LoadingState";
import type { ContentFormSchema } from "@/components/admin/fields/SchemaForm";
import { SEOHead } from "@/seo/SEOHead";

const SCHEMA: ContentFormSchema = {
  groups: [
    {
      title: "Modèles d'email",
      fields: [
        {
          name: "templates",
          label: "Modèles",
          type: "repeatable",
          itemLabel: "un modèle",
          fields: [
            { name: "key", label: "Clé technique", type: "text", placeholder: "welcome" },
            { name: "name", label: "Nom", type: "text" },
            { name: "subject", label: "Objet", type: "text", fullWidth: true },
            { name: "body", label: "Corps (variables {{...}})", type: "textarea", fullWidth: true },
          ],
        },
      ],
    },
  ],
};

export default function Emails() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const query = useEmailConfig();
  const [value, setValue] = useState<EmailConfig | null>(null);

  useEffect(() => {
    if (query.data && value === null) setValue(query.data);
  }, [query.data, value]);

  const save = useMutation({
    mutationFn: (next: EmailConfig) => updateEmailConfig(next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteConfigKeys.emails });
      notify("Modèles enregistrés ✓", "success");
    },
    onError: () => notify("Enregistrement impossible.", "error"),
  });

  if (!value) return <LoadingState />;

  return (
    <>
      <SEOHead title="Emails" noIndex />
      <ConfigEditor
        title="Modèles d'email"
        subtitle="Gérez les modèles d'email. L'envoi est effectué par une Cloud Function qui lit ces modèles."
        schema={SCHEMA}
        value={value as unknown as Record<string, unknown>}
        onChange={(next) => setValue(next as unknown as EmailConfig)}
        onSave={() => save.mutate(value)}
        onReset={() => setValue(DEFAULT_EMAILS)}
        saving={save.isPending}
      />
    </>
  );
}

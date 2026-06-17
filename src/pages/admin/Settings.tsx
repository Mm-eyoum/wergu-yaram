import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { useSiteSettings, siteConfigKeys } from "@/hooks/useSiteConfig";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/services/siteConfig";
import { updateSiteSettings } from "@/services/admin/siteConfigAdmin";
import { ConfigEditor } from "@/components/admin/ConfigEditor";
import { LoadingState } from "@/components/ui/LoadingState";
import type { ContentFormSchema } from "@/components/admin/fields/SchemaForm";
import { SEOHead } from "@/seo/SEOHead";

const SCHEMA: ContentFormSchema = {
  groups: [
    {
      title: "Général",
      fields: [
        { name: "siteName", label: "Nom du site", type: "text" },
        { name: "tagline", label: "Slogan", type: "text" },
        { name: "description", label: "Description (pied de page)", type: "textarea" },
      ],
    },
    {
      title: "Contact",
      fields: [
        { name: "contactEmail", label: "Email", type: "text" },
        { name: "contactPhone", label: "Téléphone", type: "text" },
        { name: "address", label: "Adresse", type: "text" },
      ],
    },
    {
      title: "Réseaux sociaux",
      fields: [
        {
          name: "social",
          label: "Liens sociaux",
          type: "object",
          fields: [
            { name: "facebook", label: "Facebook", type: "text" },
            { name: "instagram", label: "Instagram", type: "text" },
            { name: "youtube", label: "YouTube", type: "text" },
            { name: "linkedin", label: "LinkedIn", type: "text" },
            { name: "twitter", label: "X / Twitter", type: "text" },
          ],
        },
      ],
    },
    {
      title: "Fonctionnalités",
      fields: [
        {
          name: "features",
          label: "Modules activés",
          type: "object",
          fields: [
            { name: "donations", label: "Dons", type: "boolean" },
            { name: "forum", label: "Forum", type: "boolean" },
            { name: "messaging", label: "Messagerie", type: "boolean" },
            { name: "events", label: "Événements", type: "boolean" },
          ],
        },
      ],
    },
  ],
};

export default function Settings() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const query = useSiteSettings();
  const [value, setValue] = useState<SiteSettings | null>(null);

  useEffect(() => {
    if (query.data && value === null) setValue(query.data);
  }, [query.data, value]);

  const save = useMutation({
    mutationFn: (next: SiteSettings) => updateSiteSettings(next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteConfigKeys.settings });
      notify("Paramètres enregistrés ✓", "success");
    },
    onError: () => notify("Enregistrement impossible.", "error"),
  });

  if (!value) return <LoadingState />;

  return (
    <>
      <SEOHead title="Paramètres" noIndex />
      <ConfigEditor
        title="Paramètres du site"
        subtitle="Identité, contact, réseaux sociaux et modules de la plateforme."
        schema={SCHEMA}
        value={value as unknown as Record<string, unknown>}
        onChange={(next) => setValue(next as unknown as SiteSettings)}
        onSave={() => save.mutate(value)}
        onReset={() => setValue(DEFAULT_SETTINGS)}
        saving={save.isPending}
      />
    </>
  );
}

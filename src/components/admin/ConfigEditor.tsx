import { Button } from "@/components/ui/Button";
import { SchemaForm, type ContentFormSchema } from "@/components/admin/fields/SchemaForm";

/**
 * Thin wrapper around SchemaForm for singleton config docs (settings, menus):
 * page header + form + sticky save bar with an optional "reset to defaults".
 */
export function ConfigEditor({
  title,
  subtitle,
  schema,
  value,
  onChange,
  onSave,
  onReset,
  saving,
}: {
  title: string;
  subtitle?: string;
  schema: ContentFormSchema;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  onSave: () => void;
  onReset?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary dark:text-white/60">{subtitle}</p>}
      </header>

      <SchemaForm schema={schema} value={value} onChange={onChange} />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-brand-navy/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          {onReset ? (
            <Button variant="ghost" size="sm" onClick={onReset} disabled={saving}>
              Réinitialiser
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={onSave} disabled={saving}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}

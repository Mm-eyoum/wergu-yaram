import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/slug";
import { StringArrayField } from "./StringArrayField";
import { ImageField } from "./ImageField";
import { CoordsField } from "./CoordsField";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "slug"
  | "select"
  | "stringArray"
  | "image"
  | "coords"
  | "object"
  | "repeatable";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  /** Sub-schema for `object` and `repeatable`. */
  fields?: FieldDef[];
  /** Source field name for `slug` auto-generation. */
  slugFrom?: string;
  /** Pour un champ `slug` : affiche un aperçu live `→ <slug>.werguyaram.org`. */
  subdomainPreview?: boolean;
  /** Singular noun for a repeatable's "Ajouter …" button. */
  itemLabel?: string;
  fullWidth?: boolean;
}

export interface FormGroup {
  title?: string;
  fields: FieldDef[];
}

export interface ContentFormSchema {
  groups: FormGroup[];
}

/** Build an empty value for a set of fields (used when adding repeatable rows). */
export function emptyForFields(fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    switch (f.type) {
      case "number":
        out[f.name] = 0;
        break;
      case "boolean":
        out[f.name] = false;
        break;
      case "stringArray":
        out[f.name] = [];
        break;
      case "repeatable":
        out[f.name] = [];
        break;
      case "object":
        out[f.name] = emptyForFields(f.fields ?? []);
        break;
      case "coords":
        out[f.name] = { lat: 0, lng: 0 };
        break;
      default:
        out[f.name] = "";
    }
  }
  return out;
}

const INPUT =
  "h-11 w-full rounded-xl border border-border-soft bg-white px-3.5 text-sm text-text-primary placeholder:text-text-secondary/70 transition-colors focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30 dark:border-white/15 dark:bg-white/5 dark:text-white";

function Label({ field }: { field: FieldDef }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-text-primary dark:text-white/90">
      {field.label}
      {field.required && <span className="text-danger"> *</span>}
    </label>
  );
}

/** Render a single field given its current value and a change handler. */
function FieldRenderer({
  field,
  value,
  row,
  onChange,
  locked,
}: {
  field: FieldDef;
  value: unknown;
  /** The full record this field belongs to (for slugFrom lookups). */
  row: Record<string, unknown>;
  onChange: (next: unknown) => void;
  /** Read-only (e.g. the slug/id once the record exists). */
  locked?: boolean;
}) {
  switch (field.type) {
    case "text":
    case "slug":
      return (
        <div>
          <Label field={field} />
          <input
            className={cn(INPUT, locked && "cursor-not-allowed opacity-60")}
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            readOnly={locked}
            aria-readonly={locked}
            onChange={(e) => !locked && onChange(e.target.value)}
          />
          {field.type === "slug" && field.subdomainPreview && (
            <p className="mt-1.5 text-xs text-text-secondary">
              →{" "}
              <span className="font-mono font-medium text-brand-green">
                {String((value as string) || "<slug>")}.werguyaram.org
              </span>
            </p>
          )}
          {field.type === "slug" && field.slugFrom && !locked && (
            <button
              type="button"
              className="mt-1.5 text-xs font-medium text-brand-green hover:underline"
              onClick={() => onChange(slugify(String(row[field.slugFrom!] ?? "")))}
            >
              Générer depuis « {field.slugFrom} »
            </button>
          )}
          {locked && (
            <p className="mt-1 text-xs text-text-secondary">
              Verrouillé : modifier l'identifiant casserait l'URL et le sous-domaine.
            </p>
          )}
          {field.help && <p className="mt-1 text-xs text-text-secondary">{field.help}</p>}
        </div>
      );

    case "textarea":
      return (
        <div>
          <Label field={field} />
          <textarea
            className={cn(INPUT, "h-auto min-h-[96px] py-2.5")}
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case "number":
      return (
        <div>
          <Label field={field} />
          <input
            type="number"
            className={INPUT}
            value={Number.isFinite(value as number) ? (value as number) : ""}
            onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          />
        </div>
      );

    case "boolean":
      return (
        <label className="flex cursor-pointer items-center gap-2.5 py-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border-soft text-brand-green focus:ring-brand-teal/40"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-sm font-medium text-text-primary dark:text-white/90">{field.label}</span>
        </label>
      );

    case "select":
      return (
        <div>
          <Label field={field} />
          <select className={INPUT} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="" disabled>
              Sélectionner…
            </option>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "stringArray":
      return (
        <div>
          <Label field={field} />
          <StringArrayField value={(value as string[]) ?? []} onChange={onChange} placeholder={field.placeholder} />
        </div>
      );

    case "image":
      return (
        <div>
          <Label field={field} />
          <ImageField value={(value as string) ?? ""} onChange={onChange} />
        </div>
      );

    case "coords":
      return (
        <div>
          <Label field={field} />
          <CoordsField value={value as { lat: number; lng: number }} onChange={onChange} />
        </div>
      );

    case "object": {
      const obj = (value as Record<string, unknown>) ?? {};
      return (
        <fieldset className="rounded-xl border border-border-soft p-3 dark:border-white/10">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {field.label}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {field.fields?.map((sub) => (
              <div key={sub.name} className={sub.fullWidth || sub.type === "textarea" ? "sm:col-span-2" : ""}>
                <FieldRenderer
                  field={sub}
                  value={obj[sub.name]}
                  row={obj}
                  onChange={(v) => onChange({ ...obj, [sub.name]: v })}
                />
              </div>
            ))}
          </div>
        </fieldset>
      );
    }

    case "repeatable": {
      const items = (value as Record<string, unknown>[]) ?? [];
      const subFields = field.fields ?? [];
      const update = (next: Record<string, unknown>[]) => onChange(next);
      return (
        <div>
          <Label field={field} />
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-xl border border-border-soft p-3 dark:border-white/10">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">
                    {field.itemLabel ?? "Élément"} {i + 1}
                  </span>
                  <div className="flex gap-1">
                    <IconBtn label="Monter" disabled={i === 0} onClick={() => update(move(items, i, i - 1))}>
                      <ChevronUp className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Descendre" disabled={i === items.length - 1} onClick={() => update(move(items, i, i + 1))}>
                      <ChevronDown className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Supprimer" onClick={() => update(items.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </IconBtn>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {subFields.map((sub) => (
                    <div key={sub.name} className={sub.fullWidth || sub.type === "textarea" || sub.type === "stringArray" || sub.type === "repeatable" ? "sm:col-span-2" : ""}>
                      <FieldRenderer
                        field={sub}
                        value={item[sub.name]}
                        row={item}
                        onChange={(v) => update(items.map((it, j) => (j === i ? { ...it, [sub.name]: v } : it)))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => update([...items, emptyForFields(subFields)])}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-brand-green/50 px-3 py-2 text-sm font-medium text-brand-green hover:bg-brand-mint/50"
            >
              <Plus className="h-4 w-4" /> Ajouter {field.itemLabel ?? "un élément"}
            </button>
          </div>
        </div>
      );
    }
  }
}

function IconBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-lg text-text-secondary hover:bg-brand-soft disabled:opacity-30 dark:hover:bg-white/5"
    >
      {children}
    </button>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Renders a full content editor form from a schema. Controlled: the parent
 * holds the whole record and receives the updated record on every change.
 */
export function SchemaForm({
  schema,
  value,
  onChange,
  lockedFields,
}: {
  schema: ContentFormSchema;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Field names rendered read-only (e.g. the slug/id while editing). */
  lockedFields?: string[];
}) {
  const set = (name: string, v: unknown) => onChange({ ...value, [name]: v });
  const isLocked = (name: string) => !!lockedFields?.includes(name);

  return (
    <div className="space-y-6">
      {schema.groups.map((group, gi) => (
        <section key={gi} className="card-surface p-5 dark:bg-white/5">
          {group.title && (
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-text-secondary dark:text-white/50">
              {group.title}
            </h3>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div
                key={field.name}
                className={
                  field.fullWidth ||
                  ["textarea", "stringArray", "object", "repeatable", "image", "coords"].includes(field.type)
                    ? "sm:col-span-2"
                    : ""
                }
              >
                <FieldRenderer field={field} value={value[field.name]} row={value} onChange={(v) => set(field.name, v)} locked={isLocked(field.name)} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

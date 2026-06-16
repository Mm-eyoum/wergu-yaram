/**
 * URL-safe slug from a free-text title: lowercased, accents stripped,
 * non-alphanumerics collapsed to single hyphens.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

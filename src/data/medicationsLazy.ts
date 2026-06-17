import type { Medication } from "@/types/domain";
import { applyEnrichments } from "./medicationEnrichments";

/**
 * Lazy medication loader for the **browser**. The 848 KB LME dataset is pulled
 * via a dynamic `import()` so Vite emits it as a separate async chunk that is
 * fetched only when the mock fallback is actually needed (Firestore empty/absent
 * or the local search index is built) — never in the initial bundle. The result
 * is cached so repeated calls don't re-import or re-merge.
 */
let cache: Promise<Medication[]> | null = null;

export function getMockMedications(): Promise<Medication[]> {
  if (!cache) {
    cache = import("./lme/medications.generated.json").then((m) =>
      applyEnrichments(m.default as Medication[]),
    );
  }
  return cache;
}

export async function getMockMedicationBySlug(slug: string): Promise<Medication | undefined> {
  return (await getMockMedications()).find((m) => m.slug === slug);
}

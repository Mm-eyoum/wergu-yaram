import type { Medication } from "@/types/domain";
import generated from "./lme/medications.generated.json";
import { applyEnrichments } from "./medicationEnrichments";

/**
 * Référentiel des médicaments — chargement **synchrone** (import statique du
 * JSON). Réservé au pipeline de build SEO (scripts/* via src/seo/routes.ts) ;
 * le navigateur passe par {@link import("./medicationsLazy")} pour garder le
 * dataset LME (848 Ko) hors du bundle initial.
 *
 * Base : import structurel **intégral** de la Liste Nationale des Médicaments
 * Essentiels du Burkina Faso, Édition 2023 (`lme/medications.generated.json`,
 * produit par `scripts/parseLme.ts`). Surcouche clinique : voir
 * `medicationEnrichments.ts`. Conformité UEMOA (Règlement N°04/2020).
 */
export const medications: Medication[] = applyEnrichments(generated as Medication[]);

export const medicationBySlug = (slug: string) => medications.find((m) => m.slug === slug);

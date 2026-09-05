import { defineConfig } from "vitest/config";

/**
 * Suite d'autorisation — environnement Node pur, sans binding ni émulateur.
 *
 * Volontairement isolée de la racine du dépôt : `postcss` y est déclaré en
 * inline vide pour empêcher Vite de remonter jusqu'à ../../postcss.config.js
 * (Tailwind), dont ces tests n'ont évidemment aucun besoin.
 */
export default defineConfig({
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globals: false,
    css: false,
  },
});

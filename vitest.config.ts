import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vitest config kept separate from the build config so unit/component tests
// (jsdom) don't interfere with Vite's production build, and Playwright e2e
// (under /e2e) is excluded from the Vitest run.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Le défaut de 5 s est trop juste : catalog.test.ts charge le jeu LME
    // (848 Ko, 560 médicaments) via un import dynamique et consomme ~4 s à lui
    // seul. Il passait de justesse en isolation et échouait sous charge
    // parallèle — une suite intermittente, pas un vrai échec.
    testTimeout: 20000,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "e2e"],
    css: false,
  },
});

import { defineConfig } from "vitest/config";

// Dedicated config for the Firestore security-rules tests. These run in a Node
// environment against the Firestore emulator (launched by `npm run test:rules`),
// kept entirely separate from the jsdom unit/component suite so the normal
// `vitest run` never tries to hit an emulator that isn't there.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["firestore.rules.test.ts"],
    // Rules tests share one emulator; run serially to avoid cross-test races.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});

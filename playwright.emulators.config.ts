import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for AUTH + WRITE flows that must NOT touch production Firebase.
 *
 * Runs against a build made with `VITE_USE_EMULATORS=true` (SDKs wired to the
 * local Auth/Firestore emulators). Launch via `npm run e2e:emu`, which:
 *   1. builds the app pointing at the emulators,
 *   2. starts the Auth + Firestore emulators (`firebase emulators:exec`),
 *   3. runs this suite against `vite preview`.
 *
 * Kept in its own testDir (`./e2e-emu`) so the default smoke config (`./e2e`,
 * pointed at the real preview build) never picks these up.
 */
export default defineConfig({
  testDir: "./e2e-emu",
  // Writes hit a shared emulator — run serially to keep state predictable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // dist is already built (with emulators) by the npm script; just serve it.
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

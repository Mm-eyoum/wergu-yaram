import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import i18n from "@/i18n";

// Pin the UI language to French (the source locale) so locale-aware formatters
// (format.ts) are deterministic in tests — jsdom's navigator would otherwise
// make the language detector resolve to English.
void i18n.changeLanguage("fr");

// Ensure the DOM is reset between tests.
afterEach(() => {
  cleanup();
});

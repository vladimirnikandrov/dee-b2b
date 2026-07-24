import { defineConfig } from "vitest/config";
import path from "node:path";

// Mirrors the `@/*` alias in jsconfig.json so lib/ tests can import the same
// way the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["lib/**/*.test.js"],
  },
});

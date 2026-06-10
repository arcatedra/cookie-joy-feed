import { defineConfig } from "vitest/config";
import path from "node:path";

// Standalone vitest config — does NOT load vite.config.ts (which pulls in the
// TanStack Start router plugin that requires a full app context).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

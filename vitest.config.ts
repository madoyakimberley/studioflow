// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/client-dashboard/src"),
    },
  },
  test: {
    environment: "node",
  },
});

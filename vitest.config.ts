import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@amateur-app/shared-types": new URL(
        "./packages/shared-types/src/index.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    coverage: { enabled: false },
    include: ["packages/*/tests/**/*.test.ts"],
  },
});

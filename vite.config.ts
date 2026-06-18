import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { raiApiPlugin } from "./server/viteRaiApiPlugin";

export default defineConfig({
  plugins: [react(), raiApiPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "server/**/*.test.ts"],
    testTimeout: 15000,
    setupFiles: "./vitest.setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
        include: ["src/**/*.{ts,tsx}", "server/**/*.ts"],
        exclude: [
          "src/main.tsx",
          "server/**/*.test.ts",
          "server/index.ts",
          "server/viteRaiApiPlugin.ts"
        ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});

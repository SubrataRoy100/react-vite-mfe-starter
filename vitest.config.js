import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const manifestPath = fileURLToPath(
  new URL("./remotes.manifest.json", import.meta.url)
);
const alias = {};

if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    for (const name of Object.keys(manifest)) {
      const remoteAppPath = fileURLToPath(
        new URL(`./packages/${name}/src/App.jsx`, import.meta.url)
      );
      if (existsSync(remoteAppPath)) {
        alias[`${name}/App`] = remoteAppPath;
      }
    }
  } catch {
    // Ignored
  }
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./test/setup.js",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.demo-backup/**",
      "**/.git/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/*/src/**/*.{js,jsx}"],
      exclude: [
        "**/*.test.{js,jsx}",
        "**/main.jsx",
        "**/pages/**",
        "packages/*/vite.config.js",
        "**/.demo-backup/**",
      ],
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 60,
        branches: 60,
      },
    },
  },
});

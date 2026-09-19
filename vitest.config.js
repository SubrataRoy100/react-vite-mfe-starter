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
    for (const [name, cfg] of Object.entries(manifest)) {
      const dirName =
        cfg.dir ||
        cfg.package ||
        name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      const candidates = [
        new URL(`./apps/${dirName}/src/App.jsx`, import.meta.url),
        new URL(`./apps/${name}/src/App.jsx`, import.meta.url),
        new URL(`./packages/${name}/src/App.jsx`, import.meta.url),
      ];
      for (const cand of candidates) {
        const p = fileURLToPath(cand);
        if (existsSync(p)) {
          alias[`${name}/App`] = p;
          break;
        }
      }
    }
  } catch {
    // Ignored
  }
}

alias["@subrataroy100/mfe-shared/events/core"] = fileURLToPath(
  new URL("./packages/shared/src/events/mfe-events-core.js", import.meta.url)
);
alias["@subrataroy100/mfe-shared/events"] = fileURLToPath(
  new URL("./packages/shared/src/events/mfe-events.js", import.meta.url)
);
alias["@subrataroy100/mfe-shared/adapters"] = fileURLToPath(
  new URL("./packages/shared/src/adapters/index.js", import.meta.url)
);
alias["@subrataroy100/mfe-shared/constants"] = fileURLToPath(
  new URL("./packages/shared/src/constants/config.js", import.meta.url)
);
alias["@subrataroy100/mfe-shared/vite"] = fileURLToPath(
  new URL("./packages/shared/src/vite/index.js", import.meta.url)
);
alias["@subrataroy100/mfe-shared"] = fileURLToPath(
  new URL("./packages/shared/src/index.js", import.meta.url)
);

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
      include: [
        "apps/*/src/**/*.{js,jsx}",
        "packages/*/src/**/*.{js,jsx}",
      ],
      exclude: [
        "**/*.test.{js,jsx}",
        "**/main.jsx",
        "**/pages/**",
        "apps/*/vite.config.js",
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

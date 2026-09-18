import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const hasDemoService = existsSync(
  fileURLToPath(new URL("./packages/demoService/src/App.jsx", import.meta.url))
);

const alias = {};

const marketingAppPath = fileURLToPath(
  new URL("./packages/marketingMfe/src/App.jsx", import.meta.url)
);
if (existsSync(marketingAppPath)) {
  alias["marketingMfe/App"] = marketingAppPath;
}

const authAppPath = fileURLToPath(
  new URL("./packages/authMfe/src/App.jsx", import.meta.url)
);
if (existsSync(authAppPath)) {
  alias["authMfe/App"] = authAppPath;
}

if (hasDemoService) {
  alias["demoService/App"] = fileURLToPath(
    new URL("./packages/demoService/src/App.jsx", import.meta.url)
  );
  alias["demoService/MfeDevWidget"] = fileURLToPath(
    new URL(
      "./packages/demoService/src/components/MfeDevWidget.jsx",
      import.meta.url
    )
  );
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

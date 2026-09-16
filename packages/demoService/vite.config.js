import federation from "@originjs/vite-plugin-federation";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "demoService", // Unique identifier for this specific service
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App.jsx", // Exposing the full sub-site app
        "./MfeDevWidget": "./src/components/MfeDevWidget.jsx", // Exposing development testing widget
      },
      shared: {
        // requiredVersion pins remotes to a compatible React/Router major so a
        // version-mismatched remote fails loudly at load time instead of
        // producing a confusing runtime error deep in React internals.
        react: { singleton: true, requiredVersion: "^19.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
        "react-router": { singleton: true, requiredVersion: "^8.0.0" },
      },
    }),
    {
      name: "federation-css-fix",
      enforce: "post",
      generateBundle(options, bundle) {
        const entryKey = Object.keys(bundle).find((key) =>
          key.endsWith("remoteEntry.js")
        );
        if (!entryKey) return;
        const remoteEntryChunk = bundle[entryKey];
        if (!remoteEntryChunk || !remoteEntryChunk.code) return;

        const cssFiles = Object.keys(bundle)
          .filter((name) => name.endsWith(".css"))
          .map((name) => name.split("/").pop());

        const cssArray = JSON.stringify(cssFiles);

        // Vite 8 / esbuild turns string literals into template literals (backticks).
        // vite-plugin-federation only replaces single/double quoted __v__css__ strings,
        // leaving backtick `__v__css__...` untouched. At runtime, passing a string to
        // dynamicLoadingCss causes `cssFilePaths.forEach is not a function`.
        // This replaces any remaining placeholders with the resolved CSS file list.
        remoteEntryChunk.code = remoteEntryChunk.code.replace(
          /(["'`])__v__css__.*?\1/g,
          cssArray
        );
      },
    },
  ],
  server: {
    port: 5001,
    strictPort: true,
  },
  preview: {
    port: 5001,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  build: {
    modulePreload: false,
    target: "esnext",
    // Minify real production builds; skip it for the "development" mode watch
    // build so `pnpm dev` rebuilds stay fast on every file save.
    minify: mode === "production",
    cssCodeSplit: false,
  },
}));

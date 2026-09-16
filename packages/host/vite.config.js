import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import federation from "@originjs/vite-plugin-federation";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Single source of truth for every remote micro-frontend in the workspace.
// Adding a new remote to the manifest is enough to wire it into the host's
// federation config below — no manual editing of this file required.
const manifestPath = fileURLToPath(
  new URL("../../remotes.manifest.json", import.meta.url)
);
const remotesManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

const remotes = Object.fromEntries(
  Object.entries(remotesManifest).map(([name, cfg]) => {
    const fallbackUrl =
      process.env[cfg.envVar] || `http://localhost:${cfg.port}${cfg.entry}`;
    return [
      name,
      {
        external: `Promise.resolve((typeof window !== 'undefined' && window.__MFE_RUNTIME_CONFIG__ && window.__MFE_RUNTIME_CONFIG__['${name}']) || '${fallbackUrl}')`,
        externalType: "promise",
      },
    ];
  })
);

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "host",
      remotes,
      shared: {
        react: { singleton: true, requiredVersion: "^19.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
        "react-router": { singleton: true, requiredVersion: "^8.0.0" },
      },
    }),
  ],
  server: {
    port: 5000,
    strictPort: true,
  },

  build: {
    modulePreload: false,
    target: "esnext",
    minify: mode === "production",
    cssCodeSplit: false,
  },
}));

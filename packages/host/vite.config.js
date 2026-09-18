import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as mf from "@module-federation/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { DEFAULT_SHARED_DEPS } from "@subrataroy100/mfe-shared/vite";

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
        type: "module",
        name,
        entry: fallbackUrl,
        entryGlobalName: name,
        shareScope: "default",
      },
    ];
  })
);

const hostPort = Number(
  process.env.HOST_PORT || remotesManifest?.host?.port || 5000
);

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    mf.federation({
      name: "host",
      remotes,
      dts: false,
      shared: DEFAULT_SHARED_DEPS,
    }),
  ],
  server: {
    port: hostPort,
    strictPort: true,
  },
  preview: {
    port: hostPort,
    strictPort: true,
  },

  build: {
    modulePreload: false,
    target: "esnext",
    minify: mode === "production",
    cssCodeSplit: false,
  },
}));

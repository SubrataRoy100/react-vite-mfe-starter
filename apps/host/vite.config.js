import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as mf from "@module-federation/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { DEFAULT_SHARED_DEPS } from "@subrataroy100/mfe-shared/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../..");

// Single source of truth for every remote micro-frontend in the workspace.
const manifestPath = resolve(rootDir, "remotes.manifest.json");
const remotesManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

export default defineConfig(({ mode }) => {
  // Explicitly load .env from monorepo root so VITE_*_URL variables are never ignored
  const env = loadEnv(mode, rootDir, "");

  const remotes = Object.fromEntries(
    Object.entries(remotesManifest).map(([name, cfg]) => {
      const fallbackUrl =
        env[cfg.envVar] ||
        process.env[cfg.envVar] ||
        `http://localhost:${cfg.port}${cfg.entry}`;
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
    env.HOST_PORT || process.env.HOST_PORT || remotesManifest?.host?.port || 5000
  );

  return {
    plugins: [
      react(),
      tailwindcss(),
      mf.federation({
        name: "host",
        remotes,
        dts: false,
        shared: DEFAULT_SHARED_DEPS,
        runtimePlugins: [
          resolve(__dirname, "src/plugins/runtimeRemoteOverride.js").replace(/\\/g, "/"),
        ],
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
  };
});

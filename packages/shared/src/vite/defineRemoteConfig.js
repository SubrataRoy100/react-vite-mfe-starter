import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import federation from "@originjs/vite-plugin-federation";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Standard shared dependencies categorized by frontend framework.
 */
export const FRAMEWORK_SHARED_DEPS = {
  react: {
    react: { singleton: true, requiredVersion: "^19.0.0" },
    "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
    "react-router": { singleton: true, requiredVersion: "^8.0.0" },
  },
  vue: {
    vue: { singleton: true },
  },
  svelte: {},
  solid: {
    "solid-js": { singleton: true },
  },
  vanilla: {},
};

/**
 * Backward compatibility alias for React default shared dependencies.
 */
export const DEFAULT_SHARED_DEPS = FRAMEWORK_SHARED_DEPS.react;

/**
 * Workaround Vite 8 template literal placeholder bug in vite-plugin-federation.
 * Vite 8 / esbuild turns string literals into template literals (backticks).
 * vite-plugin-federation only replaces single/double quoted __v__css__ strings,
 * leaving backtick `__v__css__...` untouched.
 */
export const federationCssFixPlugin = {
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
    remoteEntryChunk.code = remoteEntryChunk.code.replace(
      /(["'`])__v__css__.*?\1/g,
      cssArray
    );
  },
};

/**
 * Attempts to locate and read remotes.manifest.json by searching upwards.
 */
function findManifest(startDir = process.cwd()) {
  let curr = startDir;
  while (true) {
    const target = resolve(curr, "remotes.manifest.json");
    if (existsSync(target)) {
      try {
        return JSON.parse(readFileSync(target, "utf-8"));
      } catch {
        return null;
      }
    }
    const parent = dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return null;
}

/**
 * Define a Vite configuration preset for Micro-Frontend remotes across any framework.
 *
 * Supported frameworks: "react" (default) | "vue" | "svelte" | "solid" | "vanilla" | "none"
 *
 * @param {object | ((env: import('vite').ConfigEnv) => object)} optionsOrFn
 * @returns {import('vite').UserConfigExport}
 */
export function defineRemoteConfig(optionsOrFn) {
  return defineConfig((env) => {
    const rawOptions =
      typeof optionsOrFn === "function" ? optionsOrFn(env) : optionsOrFn;

    const {
      name,
      framework = "react",
      frameworkPlugin,
      tailwind = true,
      port: customPort,
      manifestPath,
      filename = "remoteEntry.js",
      exposes = {},
      shared = {},
      federationOptions = {},
      reactOptions,
      plugins = [],
      server = {},
      preview = {},
      build = {},
      cors = true,
      extend,
      ...restConfig
    } = rawOptions || {};

    if (!name) {
      throw new Error(
        "[defineRemoteConfig] A unique 'name' is required for the micro-frontend remote."
      );
    }

    // Auto-resolve port from remotes.manifest.json if not explicitly provided
    let port = customPort;
    if (port === undefined) {
      let manifest = null;
      if (manifestPath && existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        } catch {
          manifest = null;
        }
      } else {
        manifest = findManifest();
      }

      if (manifest && manifest[name]?.port) {
        port = manifest[name].port;
      }
    }

    // Determine baseline shared dependencies based on framework
    const baselineShared = FRAMEWORK_SHARED_DEPS[framework] || {};
    const mergedShared = {
      ...baselineShared,
      ...shared,
    };

    // Determine framework bundler plugin
    const frameworkPlugins = [];
    if (frameworkPlugin) {
      frameworkPlugins.push(frameworkPlugin);
    } else if (framework === "react") {
      frameworkPlugins.push(react(reactOptions));
    }

    const { rollupOptions: userRollupOptions = {}, ...userBuild } = build;
    const { output: userOutput = {}, ...userRollupRest } = userRollupOptions;

    const baseOutput = {
      entryFileNames: (chunkInfo) => {
        if (chunkInfo?.name?.includes("remoteEntry")) {
          return "[name].js";
        }
        if (typeof userOutput.entryFileNames === "function") {
          return userOutput.entryFileNames(chunkInfo);
        }
        if (typeof userOutput.entryFileNames === "string") {
          return userOutput.entryFileNames;
        }
        return "assets/[name]-[hash].js";
      },
      chunkFileNames: userOutput.chunkFileNames || "assets/[name]-[hash].js",
      assetFileNames: userOutput.assetFileNames || "assets/[name]-[hash][extname]",
    };

    const mergedOutput = Array.isArray(userOutput)
      ? userOutput.map((out) => ({ ...out, ...baseOutput }))
      : { ...userOutput, ...baseOutput };

    const config = {
      plugins: [
        ...frameworkPlugins,
        ...(tailwind ? [tailwindcss()] : []),
        federation({
          name,
          filename,
          exposes,
          shared: mergedShared,
          ...federationOptions,
        }),
        federationCssFixPlugin,
        ...plugins,
      ],
      server: {
        port,
        strictPort: true,
        ...server,
      },
      preview: {
        port,
        strictPort: true,
        headers: {
          ...(cors
            ? { "Access-Control-Allow-Origin": cors === true ? "*" : cors }
            : {}),
          ...preview.headers,
        },
        ...preview,
      },
      build: {
        modulePreload: false,
        target: "esnext",
        minify: env.mode === "production",
        cssCodeSplit: false,
        assetsDir: "",
        ...userBuild,
        rollupOptions: {
          ...userRollupRest,
          output: mergedOutput,
        },
      },
      ...restConfig,
    };

    if (typeof extend === "function") {
      const extended = extend(config, env);
      if (extended && typeof extended === "object") {
        return extended;
      }
    }

    return config;
  });
}

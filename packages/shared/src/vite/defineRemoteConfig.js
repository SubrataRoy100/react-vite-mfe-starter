import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import originjsFederation from "@originjs/vite-plugin-federation";
import { federation as mfFederation } from "@module-federation/vite";
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
  none: {},
};

/**
 * Backward compatibility alias for React default shared dependencies.
 */
export const DEFAULT_SHARED_DEPS = FRAMEWORK_SHARED_DEPS.react;

/**
 * Workaround Vite 8 template literal placeholder bug in vite-plugin-federation,
 * and automatically injects remote CSS styles into document.head at runtime
 * when remoteEntry.js is loaded by the Host container.
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

    // All CSS files in the bundle (relative to output directory)
    const cssBundleFiles = Object.keys(bundle).filter((name) =>
      name.endsWith(".css")
    );

    const cssFileBasenames = cssBundleFiles.map((name) => name.split("/").pop());

    // 1. Replace the vite-plugin-federation __v__css__ placeholder
    const cssArray = JSON.stringify(cssFileBasenames);
    remoteEntryChunk.code = remoteEntryChunk.code.replace(
      /(["'`])__v__css__.*?\1/g,
      cssArray
    );

    // 2. Prepend runtime auto-injector if CSS files exist and not already injected
    if (cssBundleFiles.length > 0) {
      const cssPathsJson = JSON.stringify(cssBundleFiles);
      const injectorCode = `(function() {
  if (typeof document === 'undefined') return;
  try {
    var curUrl = '';
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      curUrl = import.meta.url;
    } else if (document.currentScript && document.currentScript.src) {
      curUrl = document.currentScript.src;
    }
    var baseUrl = curUrl ? curUrl.substring(0, curUrl.lastIndexOf('/') + 1) : '';
    var cssFiles = ${cssPathsJson};
    cssFiles.forEach(function(cssFile) {
      var fullHref = baseUrl ? (new URL(cssFile, baseUrl)).href : cssFile;
      var existing = document.querySelector('link[rel="stylesheet"][href="' + fullHref + '"], link[rel="stylesheet"][data-mfe-css="' + cssFile + '"]');
      if (!existing) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fullHref;
        link.setAttribute('data-mfe-css', cssFile);
        document.head.appendChild(link);
      }
    });
  } catch (e) {
    console.warn('[federation-css-fix] Auto-injecting remote styles failed:', e);
  }
})();\n`;

      if (!remoteEntryChunk.code.includes("[federation-css-fix]")) {
        remoteEntryChunk.code = injectorCode + remoteEntryChunk.code;
      }
    }
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
 * Merges baseline framework shared dependencies with user overrides cleanly,
 * preserving singleton and package options.
 *
 * @param {string} [framework="react"]
 * @param {object|string[]} [userShared={}]
 * @returns {Record<string, any>}
 */
export function mergeSharedDeps(framework = "react", userShared = {}) {
  const baselineShared = FRAMEWORK_SHARED_DEPS[framework] || {};
  const mergedShared = {};

  // Copy baseline definitions safely
  for (const [dep, baselineConfig] of Object.entries(baselineShared)) {
    mergedShared[dep] =
      typeof baselineConfig === "object" && baselineConfig !== null
        ? { ...baselineConfig }
        : baselineConfig;
  }

  // Deep merge user overrides per dependency to preserve singleton settings
  if (Array.isArray(userShared)) {
    for (const dep of userShared) {
      if (!mergedShared[dep]) {
        mergedShared[dep] = {};
      }
    }
  } else if (typeof userShared === "object" && userShared !== null) {
    for (const [dep, userConfig] of Object.entries(userShared)) {
      if (
        mergedShared[dep] &&
        typeof mergedShared[dep] === "object" &&
        typeof userConfig === "object" &&
        userConfig !== null &&
        !Array.isArray(userConfig)
      ) {
        mergedShared[dep] = {
          ...mergedShared[dep],
          ...userConfig,
        };
      } else {
        mergedShared[dep] = userConfig;
      }
    }
  }

  return mergedShared;
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
      engine = "module-federation",
      framework = "react",
      frameworkPlugin,
      tailwind = true,
      port: customPort,
      manifestPath,
      filename = "remoteEntry.js",
      exposes = {},
      shared = {},
      dts = false,
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
    const mergedShared = mergeSharedDeps(framework, shared);

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

    let fedPlugins = [];
    if (engine === "originjs") {
      fedPlugins = [
        originjsFederation({
          name,
          filename,
          exposes,
          shared: mergedShared,
          ...federationOptions,
        }),
        federationCssFixPlugin,
      ];
    } else {
      const res = mfFederation({
        name,
        filename,
        exposes,
        shared: mergedShared,
        dts: dts ?? false,
        ...federationOptions,
      });
      fedPlugins = Array.isArray(res) ? res : [res];
    }

    const config = {
      plugins: [
        ...frameworkPlugins,
        ...(tailwind ? [tailwindcss()] : []),
        ...fedPlugins,
        ...plugins,
      ].filter(Boolean),
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

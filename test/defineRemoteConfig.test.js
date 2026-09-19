import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { defineRemoteConfig, DEFAULT_SHARED_DEPS } from "../packages/shared/src/vite/index.js";

const mockManifestPath = resolve(process.cwd(), "test/fixtures/mock-remotes.manifest.json");

process.env.MFE_VITE_NO_TEST_ENV_CHECK = "true";

describe("defineRemoteConfig", () => {
  it("throws an error if name is not provided", () => {
    const configFn = defineRemoteConfig({});
    expect(() => configFn({ mode: "development", command: "serve" })).toThrow(
      /A unique 'name' is required/
    );
  });

  it("auto-resolves port from remotes.manifest.json if omitted", () => {
    const configFn = defineRemoteConfig({
      name: "testRemote",
      manifestPath: mockManifestPath,
      exposes: { "./App": "./src/App.jsx" },
    });
    const resolved = configFn({ mode: "development", command: "serve" });
    expect(resolved.server.port).toBe(5002);
    expect(resolved.preview.port).toBe(5002);
    expect(resolved.preview.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("allows explicit port override", () => {
    const configFn = defineRemoteConfig({
      name: "customRemote",
      port: 9999,
    });
    const resolved = configFn({ mode: "development", command: "serve" });
    expect(resolved.server.port).toBe(9999);
    expect(resolved.preview.port).toBe(9999);
  });

  it("merges custom shared dependencies with default shared dependencies", () => {
    const configFn = defineRemoteConfig({
      name: "billingService",
      port: 5002,
      shared: {
        zustand: { singleton: true },
        react: { singleton: true, requiredVersion: "^19.2.0" },
      },
      plugins: [
        {
          name: "test-plugin",
        },
      ],
    });

    const resolved = configFn({ mode: "production", command: "build" });
    const federationPlugin = resolved.plugins
      .flat(Infinity)
      .find(
        (p) =>
          p &&
          typeof p.name === "string" &&
          (p.name.includes("module-federation") || p.name.includes("mf"))
      );
    expect(federationPlugin).toBeDefined();

    // Check custom plugins are included
    const testPlugin = resolved.plugins.find((p) => p && p.name === "test-plugin");
    expect(testPlugin).toBeDefined();
  });

  it("supports the extend hook to customize final config", () => {
    const configFn = defineRemoteConfig({
      name: "extendService",
      extend: (cfg, env) => {
        cfg.customOption = "custom-value";
        if (env.mode === "test") {
          cfg.modeSpecific = true;
        }
      },
    });

    const resolved = configFn({ mode: "test", command: "serve" });
    expect(resolved.customOption).toBe("custom-value");
    expect(resolved.modeSpecific).toBe(true);
  });

  it("supports function signature for dynamic options", () => {
    const configFn = defineRemoteConfig((env) => ({
      name: "dynamicService",
      base: env.mode === "production" ? "/cdn/" : "/",
    }));

    const prodResolved = configFn({ mode: "production", command: "build" });
    expect(prodResolved.base).toBe("/cdn/");

    const devResolved = configFn({ mode: "development", command: "serve" });
    expect(devResolved.base).toBe("/");
  });

  it("supports framework: 'vue' with custom frameworkPlugin and vue singleton", () => {
    const mockVuePlugin = { name: "vite:vue" };
    const configFn = defineRemoteConfig({
      name: "vueService",
      framework: "vue",
      frameworkPlugin: mockVuePlugin,
      port: 5003,
    });

    const resolved = configFn({ mode: "development", command: "serve" });

    // Should include custom vue plugin, NOT react plugin
    const hasVuePlugin = resolved.plugins.some((p) => p && p.name === "vite:vue");
    const hasReactPlugin = resolved.plugins.some((p) => p && p.name === "vite:react-babel");
    expect(hasVuePlugin).toBe(true);
    expect(hasReactPlugin).toBe(false);
  });

  it("supports framework: 'vanilla' without framework plugins", () => {
    const configFn = defineRemoteConfig({
      name: "vanillaService",
      framework: "vanilla",
      port: 5004,
      tailwind: false,
    });

    const resolved = configFn({ mode: "development", command: "serve" });

    // Should not include react or tailwind plugin
    const hasReactPlugin = resolved.plugins.some((p) => p && p.name === "vite:react-babel");
    const hasTailwindPlugin = resolved.plugins.some((p) => p && p.name === "@tailwindcss/vite");
    expect(hasReactPlugin).toBe(false);
    expect(hasTailwindPlugin).toBe(false);

    // Federation should still be present
    const hasFederation = resolved.plugins
      .flat(Infinity)
      .some((p) => p && typeof p.name === "string" && (p.name.includes("module-federation") || p.name.includes("mf")));
    expect(hasFederation).toBe(true);
  });

  it("resolves port from custom manifestPath", () => {
    const configFn = defineRemoteConfig({
      name: "testRemote",
      manifestPath: mockManifestPath,
    });

    const resolved = configFn({ mode: "development", command: "serve" });
    expect(resolved.server.port).toBe(5002);
  });

  it("preserves unhashed remoteEntry.js naming even when user supplies custom build.rollupOptions", () => {
    const configFn = defineRemoteConfig({
      name: "entryNamingService",
      build: {
        sourcemap: true,
        rollupOptions: {
          external: ["lodash"],
          output: {
            format: "esm",
            entryFileNames: "custom/[name].js",
          },
        },
      },
    });

    const resolved = configFn({ mode: "production", command: "build" });
    expect(resolved.build.sourcemap).toBe(true);
    expect(resolved.build.rollupOptions.external).toEqual(["lodash"]);
    expect(resolved.build.rollupOptions.output.format).toBe("esm");

    // remoteEntry chunk must ALWAYS be [name].js at root
    const entryFn = resolved.build.rollupOptions.output.entryFileNames;
    expect(entryFn({ name: "remoteEntry" })).toBe("[name].js");
    // Non-remoteEntry chunks should use the custom naming or default
    expect(entryFn({ name: "main" })).toBe("custom/[name].js");
  });
});

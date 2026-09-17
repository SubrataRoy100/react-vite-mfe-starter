import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

export default defineConfig({
  entry: {
    index: "src/index.js",
    "events/index": "src/events/mfe-events.js",
    "events/core": "src/events/mfe-events-core.js",
    "constants/index": "src/constants/config.js",
    "adapters/index": "src/adapters/index.js",
    "components/Button": "src/components/Button.jsx",
    "vite/index": "src/vite/index.js",
  },
  format: ["esm", "cjs"],
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "es2022",
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "vite",
    "@tailwindcss/vite",
    "@originjs/vite-plugin-federation",
    "@vitejs/plugin-react",
  ],
  async onSuccess() {
    const baseDir = import.meta.dirname || process.cwd();
    const distDir = resolve(baseDir, "dist");

    // Copy core static definitions
    const copyPairs = [
      ["src/events/mfe-events-core.d.ts", "dist/events/core.d.ts"],
      ["src/constants/config.d.ts", "dist/constants/index.d.ts"],
      ["src/components/Button.d.ts", "dist/components/Button.d.ts"],
      ["src/vite/index.d.ts", "dist/vite/index.d.ts"],
    ];

    for (const [src, dest] of copyPairs) {
      const srcPath = resolve(baseDir, src);
      const destPath = resolve(baseDir, dest);
      if (existsSync(srcPath)) {
        mkdirSync(dirname(destPath), { recursive: true });
        copyFileSync(srcPath, destPath);
      }
    }

    // 1. dist/events/index.d.ts
    const eventsIndexDts = `import type {
  MfeEventMap,
  MfeEventPayload,
  ScopedCoreEventBus,
  EventBusOptions,
} from "./core.js";

export * from "./core.js";

export interface ScopedEventBus extends ScopedCoreEventBus {
  useListener<K extends keyof MfeEventMap>(
    eventName: K,
    handler: (detail: MfeEventMap[K] & MfeEventPayload) => void
  ): void;
  useListener<T = MfeEventPayload>(
    eventName: string,
    handler: (detail: T) => void
  ): void;
}

export declare function createMfeEventBus(options?: EventBusOptions): ScopedEventBus;

export declare function useMfeEventListener<K extends keyof MfeEventMap>(
  eventName: K,
  handler: (detail: MfeEventMap[K] & MfeEventPayload) => void
): void;
export declare function useMfeEventListener<T = MfeEventPayload>(
  eventName: string,
  handler: (detail: T) => void
): void;
`;
    writeFileSync(resolve(distDir, "events", "index.d.ts"), eventsIndexDts, "utf-8");

    // 2. dist/adapters/index.d.ts
    const adaptersIndexDts = `import type React from "react";
import type { MfeEventMap, MfeEventPayload } from "../events/core.js";

export interface MfeLifecycleInstance {
  update?: (props: Record<string, any>) => void;
  unmount: () => void;
}

export interface MfeLifecycle<P = Record<string, any>> {
  mount: (
    container: HTMLElement | ShadowRoot,
    props?: P
  ) => MfeLifecycleInstance | (() => void) | void;
  unmount?: (container?: HTMLElement | ShadowRoot) => void;
}

export interface DualModeReactMount<P = Record<string, any>> extends React.FC<P>, MfeLifecycle<P> {
  Component: React.ComponentType<P>;
}

export interface UniversalRemoteMountProps {
  loadRemote: () => Promise<any>;
  remoteKey?: string;
  retryKey?: number | string;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
  className?: string;
  remoteName?: string;
  shadowDom?: boolean | ShadowRootInit;
  onError?: (error: Error) => void;
}

export declare const UniversalRemoteMount: React.FC<UniversalRemoteMountProps>;

export declare function normalizeRemoteModule(
  mod: any
): {
  mount: (container: HTMLElement | ShadowRoot, props?: Record<string, any>) => any;
  unmount?: (container?: HTMLElement | ShadowRoot) => void;
  update?: (props: Record<string, any>) => void;
  Component?: React.ComponentType<any>;
  raw: any;
} | null;

export declare function createReactMount<P = Record<string, any>>(
  Component: React.ComponentType<P>
): DualModeReactMount<P>;

export declare function createVanillaMount(
  renderFn: (container: HTMLElement | ShadowRoot, props?: Record<string, any>) => (() => void) | void
): MfeLifecycle & { renderFn: Function };

export declare function useMfeEventListener<K extends keyof MfeEventMap>(
  eventName: K,
  handler: (detail: MfeEventMap[K] & MfeEventPayload) => void
): void;
export declare function useMfeEventListener<T = MfeEventPayload>(
  eventName: string,
  handler: (detail: T) => void
): void;
`;
    writeFileSync(resolve(distDir, "adapters", "index.d.ts"), adaptersIndexDts, "utf-8");

    // 3. dist/index.d.ts
    const rootIndexDts = `export * from "./events/index.js";
export * from "./constants/index.js";
export {
  UniversalRemoteMount,
  normalizeRemoteModule,
  createReactMount,
  createVanillaMount,
  type MfeLifecycle,
  type MfeLifecycleInstance,
  type DualModeReactMount,
  type UniversalRemoteMountProps,
} from "./adapters/index.js";
export * from "./components/Button.js";
`;
    writeFileSync(resolve(distDir, "index.d.ts"), rootIndexDts, "utf-8");
  },
});

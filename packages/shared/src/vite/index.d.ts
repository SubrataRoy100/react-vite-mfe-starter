import type { PluginOption, ServerOptions, PreviewOptions, BuildOptions, UserConfig, ConfigEnv, UserConfigExport } from "vite";

export type MfeFramework = "react" | "vue" | "svelte" | "solid" | "vanilla" | "none";

export interface RemoteConfigOptions extends Omit<UserConfig, "plugins" | "server" | "preview" | "build"> {
  /** Unique name of the micro-frontend remote service */
  name: string;
  /** Frontend framework used by this remote (defaults to "react") */
  framework?: MfeFramework;
  /** Custom framework bundler plugin (e.g. vue(), svelte(), solid()) */
  frameworkPlugin?: PluginOption;
  /** Whether to include Tailwind CSS v4 plugin (defaults to true) */
  tailwind?: boolean;
  /** Port number. If omitted, looked up in remotes.manifest.json automatically */
  port?: number;
  /** Custom path to remotes.manifest.json (optional) */
  manifestPath?: string;
  /** Filename of the remote entry manifest (defaults to "remoteEntry.js") */
  filename?: string;
  /** Exposed modules map (e.g. { "./App": "./src/App.jsx", "./mount": "./src/mount.js" }) */
  exposes?: Record<string, string>;
  /** Shared dependencies map (merged on top of framework defaults) */
  shared?: Record<string, any>;
  /** Extra options passed directly to @originjs/vite-plugin-federation */
  federationOptions?: Record<string, any>;
  /** Options passed to @vitejs/plugin-react (when framework is "react") */
  reactOptions?: Record<string, any>;
  /** Additional Vite plugins */
  plugins?: PluginOption[];
  /** Dev server configuration overrides */
  server?: ServerOptions;
  /** Preview server configuration overrides */
  preview?: PreviewOptions;
  /** Build configuration overrides */
  build?: BuildOptions;
  /** Configurable CORS policy for preview server headers (defaults to true / "*") */
  cors?: boolean | string;
  /** Escape-hatch hook to mutate or return a modified final Vite UserConfig */
  extend?: (config: UserConfig, env: ConfigEnv) => UserConfig | void;
}

export declare const DEFAULT_SHARED_DEPS: Record<string, any>;
export declare const FRAMEWORK_SHARED_DEPS: Record<MfeFramework, Record<string, any>>;
export declare const federationCssFixPlugin: PluginOption;

export declare function mergeSharedDeps(
  framework?: MfeFramework,
  userShared?: Record<string, any> | string[]
): Record<string, any>;

export declare function defineRemoteConfig(
  optionsOrFn: RemoteConfigOptions | ((env: ConfigEnv) => RemoteConfigOptions)
): UserConfigExport;

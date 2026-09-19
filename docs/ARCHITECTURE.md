# Micro-Frontend Architecture Specification

This document provides a comprehensive technical overview of the micro-frontend monorepo architecture, detailing module federation mechanics, host container orchestration, routing specificity, and manifest-driven contracts.

---

## 1. System Topology & Directory Structure

The repository is organized as a high-performance monorepo managed with **pnpm Workspaces** and **Turborepo**:

```text
mfe-campusmind-web/
├── packages/
│   ├── host/                     # Host Shell Container (Port 5000)
│   │   ├── src/
│   │   │   ├── components/       # Shell layouts, RemoteErrorBoundary, LoadingFallback
│   │   │   ├── pages/            # LandingPage and shell dashboard
│   │   │   ├── plugins/          # runtimeRemoteOverride.js (MF 2.0 runtime plugin)
│   │   │   ├── utils/            # resolveRemoteUrl.js (Dynamic runtime URL resolver)
│   │   │   ├── remotesRegistry.jsx # Auto-generated zero-touch route registry
│   │   │   ├── remotes.d.ts      # Auto-generated ambient TypeScript declarations
│   │   │   ├── App.jsx           # Dynamic route provider & boundary orchestrator
│   │   │   └── main.jsx          # Shell bootstrap (marks window.__IS_HOST__)
│   │   └── vite.config.js        # Host Vite & Federation 2.0 configuration
│   │
│   ├── shared/                   # Core Library (@subrataroy100/mfe-shared)
│   │   ├── src/
│   │   │   ├── adapters/         # UniversalRemoteMount, createReactMount, Shadow DOM
│   │   │   ├── events/           # Scoped Event Bus, pure core, React useMfeEventListener
│   │   │   ├── vite/             # defineRemoteConfig preset with auto CSS injection
│   │   │   ├── constants/        # MFE_CONFIG, service definitions, ports
│   │   │   ├── components/       # Primitives (e.g. Button)
│   │   │   └── index.js          # Barrel export
│   │   └── package.json          # Dual CJS/ESM exports with tracked .d.ts types
│   │
│   └── [remoteServices...]/      # Independent micro-frontends (e.g., marketingMfe, authMfe)
│
├── scripts/                      # Tooling & developer operations
│   ├── orchestrate.js            # Workspace dev & build concurrency coordinator
│   ├── manifest.js               # Manifest validator and command builder
│   ├── port-guard.js             # Cross-platform socket inspector & graceful process manager
│   ├── generate-remotes-dts.js   # Route registry and ambient type generator
│   ├── create-remote.js          # Zero-config CLI remote generator
│   ├── garbage-collector.js      # Drift detection, dead code elimination, and consistency auditor
│   ├── reset-demo.js             # Reset monorepo to clean starter state
│   └── restore-demo.js           # Restore demo micro-frontends from snapshot
│
├── remotes.manifest.json         # Single Source of Truth (SSoT) for registered remotes
├── turbo.json                    # Turborepo task dependencies and cache rules
├── netlify.toml                  # Edge deployment headers and build instructions
└── vercel.json                   # Edge routing and immutable cache rules
```

---

## 2. Module Federation 2.0 via `@module-federation/vite`

All micro-frontends in this architecture leverage **Module Federation 2.0** powered natively by `@module-federation/vite`.

### Why Module Federation 2.0?
1. **True Runtime Sharing:** Dependencies (`react`, `react-dom`, `@subrataroy100/mfe-shared`) are negotiated dynamically at runtime in the browser. Only one version of React executes, preventing multi-instance hook crashes.
2. **Standardized Engine:** Replaces deprecated legacy federation plugins with the official Module Federation specification maintained by the ByteDance / Module Federation core team.
3. **Live HMR:** Remote micro-frontends in development mode stream hot updates directly into the running host shell through native Vite WebSockets (`dev: { remoteHmr: true }`).

### Centralized Preset: `defineRemoteConfig`
Remotes define their Vite configuration through the centralized helper provided by `@subrataroy100/mfe-shared/vite`:

```javascript
// packages/<remote>/vite.config.js
import { defineRemoteConfig } from "@subrataroy100/mfe-shared/vite";

export default defineRemoteConfig({
  name: "marketingMfe",
  port: 5002,
  framework: "react",
  exposes: {
    "./App": "./src/App.jsx",
  },
});
```

`defineRemoteConfig` automatically configures:
- Singleton shared dependencies: `react`, `react-dom`, `@subrataroy100/mfe-shared`.
- Automatic CSS asset injection into remote chunks.
- Correct CORS headers (`Access-Control-Allow-Origin: *`).
- Isolated build outputs and target compatibility.

---

## 3. Host Shell Container & Route Specificity

The Host Shell acts as the primary orchestrator, providing layout navigation, error boundaries, and dynamic mount points.

### Preventing Sequential Wildcard Hijacking
When mounting multiple micro-frontends dynamically, routing collisions can occur if routes are evaluated sequentially without specificity sorting. For example, registering a root route `/` with a catch-all wildcard `/*` ahead of explicit sub-paths (e.g., `/auth/*`) will hijack all incoming requests.

Our automation (`scripts/generate-remotes-dts.js`) enforces two strict guarantees:
1. **Specificity Sorting:** Routes are sorted descending by segment depth and string length. Exact and deep routes (e.g., `/marketing/special/*`, `/auth/*`) always mount before shallower routes (e.g., `/*`).
2. **Wildcard Deduplication:** Root paths (`/`) do not declare redundant greedy catch-alls that swallow sibling applications.

```jsx
// packages/host/src/App.jsx
import { Routes, Route } from "react-router";
import { remoteRoutes } from "./remotesRegistry.jsx";
import { RemoteErrorBoundary } from "./components/RemoteErrorBoundary.jsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {remoteRoutes.map((route) => {
        const RemoteComponent = route.component;
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <RemoteErrorBoundary remoteName={route.remoteName}>
                <React.Suspense fallback={<LoadingFallback />}>
                  <RemoteComponent />
                </React.Suspense>
              </RemoteErrorBoundary>
            }
          />
        );
      })}
    </Routes>
  );
}
```

---

## 4. Single Source of Truth: `remotes.manifest.json`

The file `remotes.manifest.json` is the sole authoritative configuration for all active micro-frontends:

```json
{
  "marketingMfe": {
    "port": 5002,
    "path": "/landing",
    "entry": "http://localhost:5002/mf-manifest.json",
    "framework": "react",
    "envVar": "VITE_MARKETING_MFE_URL"
  },
  "authMfe": {
    "port": 5003,
    "path": "/auth",
    "entry": "http://localhost:5003/mf-manifest.json",
    "framework": "react",
    "envVar": "VITE_AUTH_MFE_URL"
  }
}
```

### Automation Lifecycle
- **Before Dev / Build (`predev`, `prebuild`):** `scripts/generate-remotes-dts.js` inspects `remotes.manifest.json`.
- **Generates `remotesRegistry.jsx`:** Dynamically imports remote entries with React 19 lazy loading and error boundaries.
- **Generates `remotes.d.ts`:** Produces TypeScript ambient declarations for every exposed module:
  ```typescript
  declare module "marketingMfe/App" {
    const Component: React.ComponentType<any>;
    export default Component;
  }
  ```
- **Zero Manual Edits:** Adding, removing, or renaming a remote requires only updating the manifest (or running `pnpm mfe:create`).

---

## 5. Fault Isolation & Error Boundaries

Every mounted micro-frontend is isolated inside a `<RemoteErrorBoundary>`. If a remote throws an unhandled exception or fails to load over the network:
1. The error boundary catches the exception locally.
2. The faulty remote renders a recovery UI with diagnostic details and a retry button.
3. The Host shell, main navigation bar, and all other mounted micro-frontends remain fully operational.

---

## 6. CSS Isolation Options

This starter provides two architectural options for CSS encapsulation:

1. **Utility Scoping (Default):**
   Tailwind CSS v4 isolates styling by default using modern cascade layers (`@layer theme, base, components, utilities;`).
2. **Shadow DOM Isolation:**
   For multi-framework remotes (e.g., Angular, Vue, or arbitrary third-party stylesheets), `<UniversalRemoteMount>` can attach the remote inside a Shadow Root:
   ```jsx
   <UniversalRemoteMount
     loadRemote={() => import("legacyMfe/App")}
     shadowDom={{ mode: "open" }}
   />
   ```
   All styles declared within the remote are strictly confined to the shadow tree and cannot leak into the host application.

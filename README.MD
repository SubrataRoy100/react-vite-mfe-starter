# Micro-Frontend Monorepo Starter Framework

A modern, production-ready starter project framework for **Micro-Frontends (MFE)** using **pnpm Workspaces**, **Turborepo**, **Vite Module Federation**, **React 19**, **React Router v8**, and **Tailwind CSS v4**.

Designed to split monolithic web applications into decoupled, independently deployable frontend packages while maintaining a unified developer experience.

> 📚 **Comprehensive Internal Specification**: For an in-depth breakdown of module federation internals, singletons, routing mechanics, event bus lifecycle, and production architecture, see the **[Version 1.0.0 Technical Documentation](docs/v1.0.0_DOCUMENTATION.md)**.
> 📦 **Standalone npm Library Guide**: To use the published library (`npm i @subrataroy100/mfe-shared`) in any new or existing project, see the **[In-Depth Getting Started Guide](docs/NPM_GETTING_STARTED.md)**.
> 🌐 **Multi-Framework Guide**: To build and integrate micro-frontends with **Vue 3**, **Svelte 5**, **SolidJS**, or **Vanilla JS**, see the **[Multi-Framework Architecture Guide](docs/MULTI_FRAMEWORK_GUIDE.md)**.

---

## 🏗️ Architecture Overview

```
mfe/ (Root Workspace)
├── .github/workflows/ci.yml       # GitHub Actions automated lint & build pipeline
├── turbo.json                     # Turborepo task pipeline & caching graph
├── remotes.manifest.json          # Single Source of Truth for all remote micro-frontends
├── scripts/                       # Scaled workspace orchestration (orchestrate.js, manifest.js)
├── packages/
│   ├── shared/                   # Shared Library (@subrataroy100/mfe-shared)
│   │   ├── src/
│   │   │   ├── adapters/         # Universal Remote Mount, Shadow DOM, and dual-mode mounts
│   │   │   ├── events/           # Scoped Event Bus, pure JS core, and React hooks
│   │   │   ├── vite/             # Centralized Vite federation preset + CSS auto-injection
│   │   │   ├── components/       # Shared UI primitives (Button)
│   │   │   ├── constants/        # Shared ports, origins, and configuration (config.js)
│   │   │   └── index.js          # Barrel export
│   │   └── package.json
│   │
│   ├── host/                     # Primary Shell Container (Port 5000)
│   │   ├── src/
│   │   │   ├── components/       # Shell-level components (RemoteErrorBoundary, LoadingFallback)
│   │   │   ├── pages/            # Host views (LandingPage)
│   │   │   ├── remotesRegistry.jsx # Auto-generated zero-touch dynamic remote route registry
│   │   │   ├── App.jsx           # Host dynamic routing & remote module boundaries
│   │   │   └── main.jsx          # Entry point (sets window.__IS_HOST__)
│   │   └── vite.config.js        # Dynamic federation consumer config (driven by manifest)
│   │
│   ├── marketingMfe/             # Marketing & Landing Remote (Port 5002, /landing)
│   │   ├── src/
│   │   │   ├── components/       # Feature components & MfeDevWidget
│   │   │   ├── pages/            # Marketing internal views
│   │   │   ├── App.jsx           # Sub-app routes
│   │   │   └── main.jsx          # Standalone dev entry point
│   │   └── vite.config.js        # Module Federation 2.0 provider config
│   │
│   └── authMfe/                  # Authentication & Auth Remote (Port 5003, /auth)
│       ├── src/
│       │   ├── pages/            # Login, register, and auth views
│       │   ├── App.jsx           # Sub-app routes
│       │   └── main.jsx          # Standalone dev entry point
│       └── vite.config.js        # Module Federation 2.0 provider config
│
├── docs/                         # Architecture & step-by-step setup guides
├── netlify.toml                  # Edge deployment headers (remoteEntry no-cache, assets immutable)
├── vercel.json                   # Edge deployment headers (remoteEntry no-cache, assets immutable)
├── package.json                  # Dynamic manifest-driven orchestration scripts
└── pnpm-workspace.yaml           # Workspace configuration
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: `v20+` (Tested on `v24+`)
- **pnpm**: `v9+` (Workspace mode)

### 2. Installation
Install all dependencies from the workspace root:
```bash
pnpm install
```

### 3. Start Development Environment
```bash
pnpm dev
```
This single command:
1. **Port Guard**: Pre-checks and frees any orphaned background processes on configured ports.
2. **Pre-Build**: Performs a fast initial build of remotes to guarantee `dist/` manifests exist.
3. **Zero-Touch Registry**: Automatically generates `packages/host/src/remotesRegistry.jsx` and `remotes.d.ts` from `remotes.manifest.json`.
4. **Concurrent Orchestration**: Starts all remotes in `watch` and `preview` modes, and launches `host` on `http://localhost:5000`.

Open **[http://localhost:5000](http://localhost:5000)** in your browser to view the Host portal.

---

## 🧪 Development Testing Playground Feature

This framework includes an interactive **MFE Diagnostics & Testing Playground** to test federation in real time:

1. **Runtime Context Detection**:
   - The `<MfeDevWidget />` component inspects its execution environment.
   - When loaded at `http://localhost:5002/`, it badges as **Standalone Mode (Port 5002)**.
   - When embedded inside `http://localhost:5000/`, it dynamically badges as **Embedded in Host Shell**.

2. **Cross-MFE Event Bus**:
   - Click **"Send MFE Ping"** inside the federated widget.
   - The remote emits a decoupled `CustomEvent` (`mfe:ping`) across the `window` scope.
   - The Host Shell receives the event, logs it in the live **Host Event Feed**, and automatically replies with an `mfe:pong` event.

3. **Fault-Injection & Resilience Test**:
   - Click **"Simulate Crash"** inside the federated widget.
   - The widget intentionally throws a runtime exception.
   - Notice that the `<RemoteErrorBoundary>` intercepts the failure with a clean localized card and a **Retry** button—**the Host Shell and navigation remain 100% operational**.

---

## 🔑 Key Architectural Conventions

### 1. Relative Routing (Autonomous Remotes)
Micro-frontends must not hardcode parent route prefixes. In `marketingMfe` and `authMfe`, routes are defined relatively:
```jsx
// marketingMfe/src/App.jsx
<Routes>
  <Route path="/" element={<MarketingLandingPage />} />
  <Route path="/features" element={<MarketingFeaturesPage />} />
</Routes>
```
And links use relative targets:
```jsx
// Inside remote:
<Link to="features">Features</Link>
<Link to=".." relative="path">Back</Link>
```
This ensures the sub-app runs identically both standalone at `localhost:5002/` and mounted under `/landing/*` in the host container.

### 2. Zero-Touch Dynamic Route Mounting & Localized Error Boundaries
No manual route editing is required when adding a remote! During `dev` or `build`, `scripts/generate-remotes-dts.js` automatically inspects `remotes.manifest.json` and generates `packages/host/src/remotesRegistry.jsx`.

The Host dynamically iterates over `REMOTES_REGISTRY`:
```jsx
// host/src/App.jsx
{REMOTES_REGISTRY.map((remote) => {
  const RemoteComponent = remote.component;
  return (
    <Route
      key={remote.name}
      path={`${remote.path}/*`}
      element={
        <RemoteErrorBoundary remoteName={remote.name}>
          <React.Suspense fallback={<LoadingFallback message={`Streaming ${remote.name}...`} />}>
            <RemoteComponent />
          </React.Suspense>
        </RemoteErrorBoundary>
      }
    />
  );
})}
```
Every remote route is wrapped in an isolated `<RemoteErrorBoundary>` with a Suspense fallback.

### 3. Environment-Aware & Dynamic Runtime Remote Resolution
Host remote URLs can be overridden at build-time via environment variables or dynamically at runtime:
- **Build-Time Fallback**: Standard environment variables (`VITE_MARKETING_MFE_URL`, `VITE_AUTH_MFE_URL`) resolve default CDN or localhost locations.
- **Runtime Dynamic Override (`window.__MFE_RUNTIME_CONFIG__`)**: Operations teams or service discovery layers can inject dynamic remote endpoints directly on `window` in staging and production:
```html
<script>
  window.__MFE_RUNTIME_CONFIG__ = {
    marketingMfe: "https://staging-cdn.example.com/marketing/remoteEntry.js",
    authMfe: "https://staging-cdn.example.com/auth/remoteEntry.js"
  };
</script>
```
Without rebuilding the host shell container, the browser dynamically evaluates and loads the targeted remote manifest.

### 4. Targeted Local DX (Independent Isolation)
In large monorepos with dozens of micro-frontends, developers should not be forced to run every remote locally:
```bash
# Boots only the Host Shell + marketingMfe; skips all other remotes
pnpm dev:only marketingMfe
```
The orchestration script parses `remotes.manifest.json`, isolates the requested target, and only compiles and watches the chosen remote alongside the Host shell.

### 5. Cross-Boundary Type Safety
To eliminate "any" types across lazy-loaded remote boundaries, ambient contracts (`packages/host/src/remotes.d.ts`) provide autocompletion and prop validation across module boundaries. Run:
```bash
pnpm typecheck
```
to validate type contracts across all packages without blocking rapid JavaScript iteration.

### 6. Production Library Usage (`@subrataroy100/mfe-shared`)
The shared core is published on npm as [`@subrataroy100/mfe-shared`](https://www.npmjs.com/package/@subrataroy100/mfe-shared) and can be used in any independent project:

```bash
npm install @subrataroy100/mfe-shared
```

#### A. Remote Vite Setup with Automatic CSS Injection:
```javascript
import { defineRemoteConfig } from "@subrataroy100/mfe-shared/vite";

export default defineRemoteConfig({
  name: "cartRemote",
  port: 5001,
  framework: "react",
  exposes: {
    "./App": "./src/App.jsx",
  },
});
```

#### B. Expose Dual-Mode Component in Remote:
```jsx
import { createReactMount } from "@subrataroy100/mfe-shared/adapters";

function CartApp({ theme }) {
  return <div className={`cart ${theme}`}>Cart Content</div>;
}

// Usable directly in JSX (<CartApp />) AND imperatively (CartApp.mount(domNode, props))
export default createReactMount(CartApp);
```

#### C. Consume in Host Shell with Shadow DOM Isolation:
```jsx
import { UniversalRemoteMount } from "@subrataroy100/mfe-shared/adapters";

export function HostView() {
  return (
    <UniversalRemoteMount
      module={() => import("cartRemote/App")}
      props={{ theme: "dark" }}
      shadowDom={{ mode: "open" }} // Complete style isolation
      fallback={<div>Loading remote...</div>}
    />
  );
}
```

#### D. Scoped Cross-MFE Event Bus:
```javascript
import { createMfeEventBus } from "@subrataroy100/mfe-shared/events";

const bus = createMfeEventBus({ sender: "cart-remote", namespace: "team-commerce" });

// Dispatch event
bus.send("cart:updated", { count: 3 });

// Subscribe in React with automatic lifecycle cleanup
bus.useListener("cart:updated", (detail) => {
  console.log("Cart count:", detail.count);
});
```

---

## 🛠️ Monorepo Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Pre-checks ports, builds remotes, generates registry, then starts watch, preview, and host dev concurrently. |
| `pnpm dev:only <name>` | Targeted DX: Boots **only** the Host Shell and a specific Remote (e.g. `pnpm dev:only marketingMfe`). |
| `pnpm mfe:create <name>` | **One-command remote scaffolder**: Generates full package, auto-allocates port, updates manifest, and mounts routes. |
| `pnpm clean:ports` | Kills any orphaned or ghost background processes holding MFE dev/preview ports. |
| `pnpm build` | Production build across all packages using **Turborepo** with outputs caching (`>>> FULL TURBO`). |
| `pnpm build:remotes` | Builds all remote micro-frontends using Turborepo (`turbo run build --filter=!host`). |
| `pnpm remotes:list` | Prints a summary table of all active remotes configured in `remotes.manifest.json`. |
| `pnpm typecheck` | Validates TypeScript types across all packages via Turborepo (`turbo run typecheck`). |
| `pnpm test` | Runs all automated unit and integration tests via Vitest. |
| `pnpm test:watch` | Runs Vitest in interactive watch mode. |
| `pnpm test:coverage` | Generates full code coverage report via `@vitest/coverage-v8`. |
| `pnpm lint` | Runs `oxlint` across all workspace packages via Turborepo (`turbo run lint`). |
| `pnpm preview` | Serves the production build of the host shell. |
| `pnpm --filter <pkg> dev` | Runs dev server for a specific package (e.g. `pnpm --filter marketingMfe dev`). |

---

## ➕ How to Add a New Remote Micro-Frontend

Adding a new micro-frontend is now **a single command** with **zero manual configuration**:

```bash
pnpm mfe:create <name> [--framework <react|vue|vanilla>] [--path </route>]
```

### Example: Creating a Billing Remote
```bash
pnpm mfe:create billingService --path /billing --framework react
```

### What this automatically does:
1. **Scaffolds Package Structure**:
   - Generates `packages/billingService/` with proper `package.json`, `index.html`, and `src/`.
   - Injects the `pnpm dev`, `pnpm build`, `pnpm preview`, and `pnpm lint` scripts.
2. **Auto-Port Allocation**:
   - Inspects `remotes.manifest.json` and assigns the next available port (e.g. `5004`).
3. **Module Federation 2.0 Configuration**:
   - Sets up `vite.config.js` using `defineRemoteConfig` from `@subrataroy100/mfe-shared/vite` powered by `@module-federation/vite`.
   - Exposes `./App` and includes Tailwind CSS v4.
4. **Registers in Manifest**:
   - Appends `billingService` to `remotes.manifest.json`.
5. **Zero-Touch Dynamic Route Mounting**:
   - On `pnpm dev` or `pnpm build`, `scripts/generate-remotes-dts.js` regenerates `packages/host/src/remotesRegistry.jsx`.
   - `packages/host/src/App.jsx` dynamically mounts `/billing/*` wrapped in `<RemoteErrorBoundary>` and Suspense fallbacks.
   - **Zero edits to Host code required!**

6. Start working immediately:
   ```bash
   pnpm dev:only billingService
   ```

#### 🛠️ Custom Settings & Overrides in `vite.config.js`:
`defineRemoteConfig` remains fully customizable:
- **Custom Plugins**: Pass extra plugins in `plugins: [svgr()]`.
- **Extra Shared Dependencies**: Pass `shared: { "zustand": { singleton: true } }` (React 19 singletons are preserved automatically).
- **Custom Vite Settings**: Pass `resolve.alias`, `server.proxy`, etc., which are merged with defaults.
- **Dynamic / Mode-Based Config**: Pass a function `defineRemoteConfig(({ mode }) => ({ ... }))` or use the `extend: (config, env) => { ... }` escape-hatch hook.

---

## 🌐 Production Deployment & Cache Control

For optimal CDN performance and instant updates:
- **`remoteEntry.js`** files must never be cached (`Cache-Control: no-cache, no-store, must-revalidate`).
- **Content-hashed assets** (`/assets/*`) are cached permanently (`Cache-Control: public, max-age=31536000, immutable`).

Pre-configured headers are included for:
- **Vercel**: [`vercel.json`](vercel.json)
- **Netlify**: [`netlify.toml`](netlify.toml)


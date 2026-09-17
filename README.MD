# Micro-Frontend Monorepo Starter Framework

A modern, production-ready starter project framework for **Micro-Frontends (MFE)** using **pnpm Workspaces**, **Turborepo**, **Vite Module Federation**, **React 19**, **React Router v8**, and **Tailwind CSS v4**.

Designed to split monolithic web applications into decoupled, independently deployable frontend packages while maintaining a unified developer experience.

> 📚 **Comprehensive Internal Specification**: For an in-depth breakdown of module federation internals, singletons, routing mechanics, event bus lifecycle, and production architecture, see the **[Version 1.0.0 Technical Documentation](docs/v1.0.0_DOCUMENTATION.md)**.
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
│   │   │   ├── App.jsx           # Host routing & remote module boundaries
│   │   │   └── main.jsx          # Entry point (sets window.__IS_HOST__)
│   │   └── vite.config.js        # Dynamic federation consumer config (driven by manifest)
│   │
│   └── demoService/              # Independent Micro-Frontend Remote (Port 5001)
│       ├── src/
│       │   ├── components/       # Feature components & MfeDevWidget
│       │   ├── pages/            # Remote internal views (DemoLandingPage, DemoSettingsPage)
│       │   ├── App.jsx           # Sub-app routes (/ & /settings)
│       │   └── main.jsx          # Standalone dev entry point
│       └── vite.config.js        # Federation provider config + federation-css-fix
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
1. Performs a fast initial build of remotes to guarantee `dist/` manifests exist.
2. Starts `demoService` in `vite build --watch` mode.
3. Launches `demoService` preview server on `http://localhost:5001`.
4. Boots the `host` shell with Vite HMR on `http://localhost:5000`.

Open **[http://localhost:5000](http://localhost:5000)** in your browser to view the Host portal.

---

## 🧪 Development Testing Playground Feature

This framework includes an interactive **MFE Diagnostics & Testing Playground** to test federation in real time:

1. **Runtime Context Detection**:
   - The `<MfeDevWidget />` component inspects its execution environment.
   - When loaded at `http://localhost:5001/`, it badges as **Standalone Mode (Port 5001)**.
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
Micro-frontends must not hardcode parent route prefixes. In `demoService`, routes are defined relatively:
```jsx
// demoService/src/App.jsx
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/settings" element={<DemoSettingsPage />} />
</Routes>
```
And links use relative targets:
```jsx
// Inside remote:
<Link to="settings">Module Settings</Link>
<Link to=".." relative="path">Back</Link>
```
This ensures the sub-app runs identically both standalone at `localhost:5001/` and mounted under `/demo/*` in the host container.

### 2. Localized Error Boundaries & Suspense Fallbacks
Remotes are loaded over the network and can fail independently. The Host wraps every remote route in an isolated boundary:
```jsx
// host/src/App.jsx
<Route
  path="/demo/*"
  element={
    <RemoteErrorBoundary remoteName="Demo Service Module">
      <React.Suspense fallback={<LoadingFallback message="Streaming Demo Service..." />}>
        <DemoApp />
      </React.Suspense>
    </RemoteErrorBoundary>
  }
/>
```

### 3. Environment-Aware & Dynamic Runtime Remote Resolution
Host remote URLs can be overridden at build-time via environment variables or dynamically at runtime:
- **Build-Time Fallback**: Standard environment variables (`VITE_DEMO_SERVICE_URL`) resolve default CDN / localhost locations.
- **Runtime Dynamic Override (`window.__MFE_RUNTIME_CONFIG__`)**: Micro-frontend remotes in `packages/host/vite.config.js` use `externalType: "promise"`. In staging/production environments, operations teams or service discovery layers can inject dynamic remote endpoints directly on `window`:
```html
<script>
  window.__MFE_RUNTIME_CONFIG__ = {
    demoService: "https://staging-cdn.example.com/remoteEntry.js"
  };
</script>
```
Without rebuilding the host shell container, the browser dynamically evaluates and loads the targeted remote manifest.

### 4. Targeted Local DX (Independent Isolation)
In large monorepos with dozens of micro-frontends, developers should not be forced to run every remote locally:
```bash
# Boots only the Host Shell + demoService; skips all other remotes
pnpm dev:only demoService
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
bus.useListener("cart:updated", (event) => {
  console.log("Cart count:", event.detail.data.count);
});
```

---

## 🛠️ Monorepo Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Dynamically builds all remotes from manifest, then concurrently starts remote watch, remote preview, and host dev. |
| `pnpm dev:only <name>` | Targeted DX: Builds and boots **only** the Host Shell and a specific Remote (e.g. `pnpm dev:only demoService`). |
| `pnpm build` | Production build across all packages using **Turborepo** with outputs caching (`>>> FULL TURBO`). |
| `pnpm build:remotes` | Builds all remote micro-frontends using Turborepo (`turbo run build --filter=!host`). |
| `pnpm remotes:list` | Prints a summary table of all active remotes configured in `remotes.manifest.json`. |
| `pnpm typecheck` | Validates TypeScript types across all packages via Turborepo (`turbo run typecheck`). |
| `pnpm test` | Runs all automated unit and integration tests via Vitest. |
| `pnpm test:watch` | Runs Vitest in interactive watch mode. |
| `pnpm test:coverage` | Generates full code coverage report via `@vitest/coverage-v8`. |
| `pnpm lint` | Runs `oxlint` across all workspace packages via Turborepo (`turbo run lint`). |
| `pnpm preview` | Serves the production build of the host shell. |
| `pnpm reset:demo` | Backs up and removes `demoService`, resetting the host shell into a clean starter setup. |
| `pnpm restore:demo` | Restores the demo service showcase and configuration from `.demo-backup/`. |
| `pnpm --filter <pkg> dev` | Runs dev server for a specific package (e.g. `pnpm --filter demoService dev`). |

---

## 🧹 Resetting to Clean Starter Mode

If you are using this repository as a production starter template and want to remove the default `demoService` showcase:

```bash
pnpm reset:demo
```

### What this does:
1. **Safety Backup**: Backs up `packages/demoService/`, current host router files, and `remotes.manifest.json` into `.demo-backup/`.
2. **Removes Demo Service**: Deletes `packages/demoService/` from the workspace.
3. **Cleans Manifest**: Updates [`remotes.manifest.json`](remotes.manifest.json) to `{}`.
4. **Applies Clean Host Shell**: Swaps `App.jsx` and `LandingPage.jsx` into clean starter templates with zero demo dependencies and instructions for registering custom remotes.
5. **Zero Downtime**: `pnpm build`, `pnpm lint`, and `pnpm test` continue to pass with 0 errors in clean mode.

### Restoring the Demo Setup
To restore the interactive demo showcase anytime:
```bash
pnpm restore:demo
```

---

## ➕ How to Add a New Remote Micro-Frontend

Adding a new micro-frontend is completely decoupled and automated through `remotes.manifest.json`:

1. **Create Package**:
   ```bash
   mkdir packages/myService
   cd packages/myService
   pnpm init
   ```
2. **Install Dependencies**:
   Add React, Vite, and `@originjs/vite-plugin-federation`:
   ```bash
   pnpm --filter myService add react react-dom react-router @subrataroy100/mfe-shared
   pnpm --filter myService add -D vite @vitejs/plugin-react @originjs/vite-plugin-federation @tailwindcss/vite tailwindcss
   ```
3. **Configure Federation (`defineRemoteConfig`)**:
   In `packages/myService/vite.config.js`, use the centralized preset from `@subrataroy100/mfe-shared/vite`:
   ```javascript
   import { defineRemoteConfig } from "@subrataroy100/mfe-shared/vite";

   export default defineRemoteConfig({
     name: "myService",
     // Port is auto-inferred from remotes.manifest.json, or can be set explicitly:
     // port: 5002,
     exposes: {
       "./App": "./src/App.jsx",
     },
   });
   ```

   #### 🛠️ Adding Custom Settings & Overrides:
   `defineRemoteConfig` is completely extensible:
   - **Custom Plugins**: Pass extra plugins in `plugins: [svgr()]`.
   - **Extra Shared Dependencies**: Pass `shared: { "zustand": { singleton: true } }` (React 19 singletons are preserved automatically).
   - **Custom Vite Settings**: Pass `resolve.alias`, `server.proxy`, etc., which are merged with defaults.
   - **Dynamic / Mode-Based Config**: Pass a function `defineRemoteConfig(({ mode }) => ({ ... }))` or use the `extend: (config, env) => { ... }` escape-hatch hook.

4. **Register in `remotes.manifest.json`**:
   Add one entry to the root manifest—**no need to touch `host/vite.config.js` or `package.json` scripts**:
   ```json
   {
     "demoService": {
       "port": 5001,
       "path": "/demo",
       "entry": "/remoteEntry.js",
       "envVar": "VITE_DEMO_SERVICE_URL"
     },
     "myService": {
       "port": 5002,
       "path": "/myservice",
       "entry": "/remoteEntry.js",
       "envVar": "VITE_MY_SERVICE_URL"
     }
   }
   ```
5. **Mount in Host Router**:
   In `packages/host/src/App.jsx`, add lazy import and route:
   ```jsx
   const MyServiceApp = React.lazy(() => import("myService/App"));
   // ...
   <Route path="/myservice/*" element={
     <RemoteErrorBoundary remoteName="My Service">
       <React.Suspense fallback={<LoadingFallback message="Loading My Service..." />}>
         <MyServiceApp />
       </React.Suspense>
     </RemoteErrorBoundary>
   } />
   ```
6. Run `pnpm dev` or `pnpm build`—the orchestration scripts automatically detect `myService` from the manifest!

---

## 🌐 Production Deployment & Cache Control

For optimal CDN performance and instant updates:
- **`remoteEntry.js`** files must never be cached (`Cache-Control: no-cache, no-store, must-revalidate`).
- **Content-hashed assets** (`/assets/*`) are cached permanently (`Cache-Control: public, max-age=31536000, immutable`).

Pre-configured headers are included for:
- **Vercel**: [`vercel.json`](vercel.json)
- **Netlify**: [`netlify.toml`](netlify.toml)


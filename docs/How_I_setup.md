# Micro-Frontend Monorepo Setup & Architecture Guide

<div align="center">

**Author:** Subrata Roy  
**Last Updated:** September 2026  
**Architecture:** Vite Module Federation + React 19 + pnpm Workspaces

</div>

---

## 📖 Table of Contents
1. [Overview](#1-overview)
2. [Workspace Initialization & Dependencies](#2-workspace-initialization--dependencies)
3. [Host Application Configuration (`packages/host`)](#3-host-application-configuration-packageshost)
4. [Remote Application Configuration (`packages/marketingMfe`, `packages/authMfe`)](#4-remote-application-configuration-packagesmarketingmfe-packagesauthmfe)
5. [Cross-MFE Communication Layer (Event Bus)](#5-cross-mfe-communication-layer-event-bus)
6. [Development Testing Playground Feature](#6-development-testing-playground-feature)
7. [How to Run, Build, and Lint](#7-how-to-run-build-and-lint)
8. [Adding a New Remote Micro-Frontend](#8-adding-a-new-remote-micro-frontend)
9. [Micro-Frontend Migration Strategy](#9-micro-frontend-migration-strategy)

---

## 1. Overview

This monorepo demonstrates a production-grade **Micro-Frontend Architecture** using modern frontend tooling:
- **pnpm Workspaces & Turborepo**: Lightning-fast monorepo package management and cached task pipelines.
- **Module Federation 2.0** (`@module-federation/vite`): Modern Vite 8 / Rolldown compatible runtime module sharing.
- **React 19 & React Router v8**: Modern component architecture and dynamic routing.
- **Tailwind CSS v4**: Utility-first styling with `@tailwindcss/vite`.
- **Fault-Tolerant Shell**: Independent `<RemoteErrorBoundary>` isolation preventing host shell crashes.
- **Decoupled Cross-MFE Event Bus**: Standard browser `CustomEvents` for loose communication without shared state libraries.
- **Port Guard**: Automated pre-flight port hygiene preventing ghost Node process collisions.

---

## 2. Workspace Initialization & Dependencies

### Step 2.1: Initialize Root Monorepo
```bash
# Initialize root package.json
pnpm init
```

### Step 2.2: Configure `pnpm-workspace.yaml`
Create `pnpm-workspace.yaml` at the root:
```yaml
packages:
  - "packages/*"
```

### Step 2.3: Root Dependencies & Scripts
In root `package.json`:
```json
{
  "name": "mfe",
  "version": "1.0.0",
  "private": true,
  "description": "Micro-Frontend Monorepo Starter Framework with Module Federation and React 19",
  "scripts": {
    "clean:ports": "node scripts/port-guard.js",
    "mfe:create": "node scripts/create-remote.js",
    "remotes:list": "node scripts/orchestrate.js list",
    "dev:remotes-build": "node scripts/orchestrate.js build-remotes",
    "dev:host": "pnpm --filter host dev",
    "dev": "node scripts/orchestrate.js dev",
    "build:remotes": "node scripts/orchestrate.js build-remotes",
    "build:host": "pnpm --filter host build",
    "build": "node scripts/orchestrate.js build",
    "lint": "turbo run lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "preview": "pnpm --filter host preview"
  },
  "devDependencies": {
    "@module-federation/vite": "^1.11.1",
    "@testing-library/react": "^16.3.3",
    "@vitejs/plugin-react": "^6.1.1",
    "@vitest/coverage-v8": "^5.0.1",
    "concurrently": "^10.0.5",
    "jsdom": "^30.0.1",
    "vitest": "^5.0.1"
  }
}
```

### Step 2.4: Single Source of Truth (`remotes.manifest.json`)
All remote micro-frontends are registered in a root configuration file:
```json
{
  "marketingMfe": {
    "port": 5002,
    "path": "/landing",
    "entry": "/remoteEntry.js",
    "envVar": "VITE_MARKETING_MFE_URL",
    "framework": "react"
  },
  "authMfe": {
    "port": 5003,
    "path": "/auth",
    "entry": "/remoteEntry.js",
    "envVar": "VITE_AUTH_MFE_URL",
    "framework": "react"
  }
}
```

---

## 3. Host Application Configuration (`packages/host`)

The Host application (port `5000`) serves as the orchestration shell.

### 3.1 Host `vite.config.js`
Dynamically reads `remotes.manifest.json` and configures Module Federation 2.0 with shared singletons to prevent multiple React instances:
```javascript
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as mf from "@module-federation/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { DEFAULT_SHARED_DEPS } from "@subrataroy100/mfe-shared/vite";

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
    port: 5000,
    strictPort: true,
  },
  preview: {
    port: 5000,
    strictPort: true,
  },
  build: {
    modulePreload: false,
    target: "esnext",
    minify: mode === "production",
    cssCodeSplit: false,
  },
}));
```

### 3.2 Host Shell Runtime Flag (`src/main.jsx`)
Sets a lightweight runtime flag so embedded micro-frontends can detect whether they are running inside the Host:
```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import "./index.css";
import App from "./App.jsx";

if (typeof window !== "undefined") {
  window.__IS_HOST__ = true;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary fallback={<div style={{ color: "red", padding: "10px" }}>Global Host Error</div>}>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);
```

### 3.3 Zero-Touch Resilient Remote Route Isolation (`src/App.jsx`)
Routes are dynamically resolved from `src/remotesRegistry.jsx` (auto-generated from `remotes.manifest.json`), with each remote wrapped in `<RemoteErrorBoundary>` and `<LoadingFallback>`:
```jsx
import React from "react";
import { Route, Routes } from "react-router";
import RemoteErrorBoundary from "./components/RemoteErrorBoundary";
import LoadingFallback from "./components/LoadingFallback";
import LandingPage from "./pages/LandingPage";
import { REMOTES_REGISTRY } from "./remotesRegistry";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <React.Suspense fallback={<LoadingFallback message="Loading CampusMind Shell..." />}>
            <LandingPage />
          </React.Suspense>
        }
      />
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
    </Routes>
  );
}

export default App;
```

---

## 4. Remote Application Configuration (`packages/marketingMfe`, `packages/authMfe`)

Remote applications operate both as independent standalone web apps and as federated sub-modules.

### 4.1 Remote `vite.config.js`
Uses the centralized `defineRemoteConfig` helper:
```javascript
import { defineRemoteConfig } from "@subrataroy100/mfe-shared/vite";

export default defineRemoteConfig({
  name: "marketingMfe",
  // Port is auto-inferred from remotes.manifest.json (port 5002)
  exposes: {
    "./App": "./src/App.jsx",
  },
  // Optional extras:
  // shared: { zustand: { singleton: true } },  // extra singletons merged on top of react defaults
  // plugins: [],                                 // additional Vite plugins
  // extend: (config, env) => config,             // escape-hatch for advanced overrides
});
```

> **Note**: `defineRemoteConfig` automatically handles:
> - React 19 singleton deps (`react`, `react-dom`, `react-router`)
> - Tailwind CSS v4 (`@tailwindcss/vite`)
> - `@module-federation/vite` Module Federation 2.0 compilation
> - Port inference from `remotes.manifest.json`
> - CORS headers on the preview server

### 4.2 Autonomous Relative Routing Rule
Never hardcode parent URLs inside remote components. Define routes and links relatively:
```jsx
// packages/marketingMfe/src/App.jsx
<Routes>
  <Route path="/" element={<MarketingLandingPage />} />
  <Route path="/features" element={<MarketingFeaturesPage />} />
</Routes>

// Inside remote views:
<Link to="features">Marketing Features</Link>
<Link to=".." relative="path">Back</Link>
```
When running standalone at `http://localhost:5002/`, this navigates to `/features`.  
When embedded at `http://localhost:5000/landing/*`, it navigates to `/landing/features`.  
When embedded at `http://localhost:5000/demo/*`, it navigates to `/demo/settings`.

---

## 5. Cross-MFE Communication Layer (Event Bus)

Both applications import decoupled event utilities from `@subrataroy100/mfe-shared`:

#### Global helpers (unscoped, for simple use cases):
```javascript
import { sendMfeEvent, listenMfeEvent, useMfeEventListener, MFE_EVENTS } from '@subrataroy100/mfe-shared/events';

// Dispatch from any MFE:
sendMfeEvent(MFE_EVENTS.PING, { count: 1 });
// MFE_EVENTS.PING = 'mfe:ping', PONG = 'mfe:pong', NOTIFICATION = 'mfe:notification',
// NAVIGATION = 'mfe:navigation', CART_UPDATE = 'mfe:cart_update', ORDER_PLACED = 'mfe:order_placed'

// React Hook (auto-cleanup on unmount, stable against re-renders):
function HostShell() {
  useMfeEventListener(MFE_EVENTS.PING, (detail) => {
    console.log('Sender:', detail.sender);        // e.g. 'Demo Remote (Port 5001)'
    console.log('Timestamp:', detail.timestamp);
    // Reply:
    sendMfeEvent(MFE_EVENTS.PONG, { message: 'received!' });
  });
}

// Imperative (any framework, returns unsubscribe fn):
const unsubscribe = listenMfeEvent(MFE_EVENTS.PING, (detail) => console.log(detail));
unsubscribe(); // cleanup when done
```

#### Scoped Event Bus (recommended for teams / multiple remotes):

Prevents event name collisions when multiple remotes run in the same window:
```javascript
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events';

// Each remote creates its own scoped bus:
const bus = createMfeEventBus({
  sender: 'demo-remote',     // identifies the emitting service
  namespace: 'demo',         // optional prefix (e.g. 'item:added' → 'demo:item:added')
});

// Send (with namespace prefix):
bus.send('item:added', { id: 'p1', name: 'Laptop', price: 1200 });

// React hook (auto-cleanup):
bus.useListener('item:added', (detail) => {
  console.log(detail.sender);    // 'demo-remote'
  console.log(detail.namespace); // 'demo'
});

// Imperative:
const unsubscribe = bus.listen('item:added', (detail) => console.log(detail));
unsubscribe();
```

#### For non-React remotes (Vue, Svelte, Vanilla):
```javascript
// Use /events/core — zero React dependency, same API minus useListener:
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events/core';
const bus = createMfeEventBus({ sender: 'vue-remote', namespace: 'team-vue' });
bus.send('search:query', { term: 'hello' });
const unsub = bus.listen('cart:updated', (detail) => console.log(detail));
```



---

## 6. Development Testing Playground Feature

The template includes an interactive diagnostic tool (`MfeDevWidget.jsx`) embedded on both the Remote landing page and the Host dashboard:

1. **Context Inspector**: Detects whether the code is executing standalone or embedded in the Host shell.
2. **Ping / Pong Event Test**: Emits an event from the remote widget. The Host shell captures it in its event feed and automatically replies with a `pong` event.
3. **Fault-Injection Crash Simulator**: Clicking **"Simulate Crash"** trips an exception. The `<RemoteErrorBoundary>` isolates the crash, rendering a localized card with a **"Retry Component"** button without crashing the Host shell.

---

## 7. How to Run, Build, and Test

### Development Mode (All Remotes)
```bash
pnpm dev
```
Dynamically reads `remotes.manifest.json` via `scripts/orchestrate.js`, pre-builds all active remotes, then spawns `watch`, `preview`, and `host dev` concurrently.

### Targeted Local DX (Host + Single Remote)
```bash
# Compile and boot ONLY marketingMfe alongside host; ignores other remotes
pnpm dev:only marketingMfe
```
Enables instant local developer iteration without running multiple unnecessary micro-services on local machines.

### Port Cleanliness Guard
```bash
# Check and kill any orphaned processes on dev/preview ports
pnpm clean:ports
```

### Production Build
```bash
pnpm build
```
Executes dynamic topological builds with Turborepo: builds all remotes in `remotes.manifest.json` first, followed by the `host` shell.

### Type Safety Verification
```bash
# Validates ambient contracts across remote module boundaries
pnpm typecheck
```

### Automated Testing & Coverage
```bash
# Run all unit and integration test suites
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate code coverage report
pnpm test:coverage
```

### Code Quality & Linting
```bash
pnpm lint
```
Runs `oxlint` across all workspace packages via Turborepo.

---

## 8. Adding a New Remote Micro-Frontend

Adding a new micro-frontend is now automated into a **single command**:

```bash
pnpm mfe:create billingService --path /billing --framework react
```

### What this automatically does:
1. **Scaffolds Directory & Package**:
   - Generates `packages/billingService/` with standard Vite + React configuration.
2. **Auto-Assigns Dev Port**:
   - Finds next available port (e.g. `5004`) and saves into `remotes.manifest.json`.
3. **Federation Preset**:
   - Configures `vite.config.js` with `defineRemoteConfig` powered by `@module-federation/vite`.
4. **Zero-Touch Route Mounting**:
   - Dynamic registry generator updates `packages/host/src/remotesRegistry.jsx`.
   - Host `App.jsx` automatically mounts `/billing/*` wrapped in error boundaries and loading fallbacks.
   - **No manual code edits to the Host are needed!**

Start developing your new remote immediately:
```bash
pnpm dev:only billingService
```

---

## 9. Micro-Frontend Migration Strategy

When splitting a large monolithic web application into micro-frontends:

1. **Split by Business Domains**: Group by business capabilities (e.g. `auth`, `dashboard`, `billing`), not tiny components.
2. **Preserve Standalone Autonomy**: Every sub-app must run on its own port independently of the shell.
3. **Decouple Router Paths**: Use relative routing inside the sub-apps so they can be mounted anywhere in the shell without code modifications.
4. **Isolate Global Side-Effects**: Scope CSS rules (Tailwind scopes, CSS Modules) to prevent style bleeding across micro-apps.
5. **Favor Event-Driven Communication**: Use loose `CustomEvents` or URL query params rather than sharing centralized global state across remote boundaries.

---

## 10. Production Deployment & Edge Caching

Pre-configured deployment profiles (`netlify.toml` and `vercel.json`) implement atomic cache control headers:
- **`remoteEntry.js`**: `Cache-Control: no-cache, no-store, must-revalidate` (guarantees clients immediately receive updated bundle manifests).
- **`/assets/*`**: `Cache-Control: public, max-age=31536000, immutable` (fingerprinted JS/CSS chunks cached forever).

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
4. [Remote Application Configuration (`packages/demoService`)](#4-remote-application-configuration-packagesdemoservice)
5. [Cross-MFE Communication Layer (Event Bus)](#5-cross-mfe-communication-layer-event-bus)
6. [Development Testing Playground Feature](#6-development-testing-playground-feature)
7. [How to Run, Build, and Lint](#7-how-to-run-build-and-lint)
8. [Adding a New Remote Micro-Frontend](#8-adding-a-new-remote-micro-frontend)
9. [Micro-Frontend Migration Strategy](#9-micro-frontend-migration-strategy)

---

## 1. Overview

This monorepo demonstrates a production-grade **Micro-Frontend Architecture** using modern frontend tooling:
- **pnpm Workspaces**: Lightning-fast monorepo package management with a single root lockfile.
- **Vite Module Federation** (`@originjs/vite-plugin-federation`): Dynamic runtime module sharing.
- **React 19 & React Router v8**: Modern component architecture and nested routing.
- **Tailwind CSS v4**: Utility-first styling with `@tailwindcss/vite`.
- **Fault-Tolerant Shell**: Independent `<RemoteErrorBoundary>` isolation preventing host shell crashes.
- **Decoupled Cross-MFE Event Bus**: Standard browser `CustomEvents` for loose communication without shared state libraries.

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
  "description": "Micro-Frontend Monorepo Starter Framework with Vite Module Federation and React 19",
  "scripts": {
    "remotes:list": "node scripts/orchestrate.js list",
    "dev:remotes-build": "node scripts/orchestrate.js build-remotes",
    "dev:host": "pnpm --filter host dev",
    "dev": "node scripts/orchestrate.js dev",
    "build:remotes": "node scripts/orchestrate.js build-remotes",
    "build:host": "pnpm --filter host build",
    "build": "node scripts/orchestrate.js build",
    "lint": "pnpm -r lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "preview": "pnpm --filter host preview"
  },
  "devDependencies": {
    "@originjs/vite-plugin-federation": "^1.4.1",
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
  "demoService": {
    "port": 5001,
    "path": "/demo",
    "entry": "/assets/remoteEntry.js",
    "envVar": "VITE_DEMO_SERVICE_URL"
  }
}
```

---

## 3. Host Application Configuration (`packages/host`)

The Host application (port `5000`) serves as the orchestration shell.

### 3.1 Host `vite.config.js`
Dynamically reads `remotes.manifest.json` and configures shared singletons to prevent multiple React instances:
```javascript
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import federation from "@originjs/vite-plugin-federation";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const manifestPath = fileURLToPath(
  new URL("../../remotes.manifest.json", import.meta.url)
);
const remotesManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

const remotes = Object.fromEntries(
  Object.entries(remotesManifest).map(([name, cfg]) => [
    name,
    process.env[cfg.envVar] ||
      `http://localhost:${cfg.port}${cfg.entry}`,
  ])
);

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "host",
      remotes,
      shared: {
        react: { singleton: true, requiredVersion: "^19.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
        "react-router": { singleton: true, requiredVersion: "^8.0.0" },
      },
    }),
  ],
  server: {
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

### 3.3 Resilient Remote Route Isolation (`src/App.jsx`)
Each remote is wrapped in `<RemoteErrorBoundary>` and `<LoadingFallback>`:
```jsx
import React from "react";
import { Route, Routes } from "react-router";
import RemoteErrorBoundary from "./components/RemoteErrorBoundary";
import LoadingFallback from "./components/LoadingFallback";

const DemoApp = React.lazy(() => import("demoService/App"));
const LandingPage = React.lazy(() => import("./pages/LandingPage"));

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <React.Suspense fallback={<LoadingFallback message="Loading Host..." />}>
            <LandingPage />
          </React.Suspense>
        }
      />
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
    </Routes>
  );
}

export default App;
```

---

## 4. Remote Application Configuration (`packages/demoService`)

The Remote application (port `5001`) operates both as an independent standalone web app and as a federated sub-module.

### 4.1 Remote `vite.config.js`
Exposes both the root sub-application (`./App`) and standalone micro-widgets (`./MfeDevWidget`) with `federation-css-fix`:
```javascript
import federation from "@originjs/vite-plugin-federation";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "demoService",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App.jsx",
        "./MfeDevWidget": "./src/components/MfeDevWidget.jsx",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^19.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
        "react-router": { singleton: true, requiredVersion: "^8.0.0" },
      },
    }),
    {
      name: "federation-css-fix",
      enforce: "post",
      generateBundle(options, bundle) {
        const entryKey = Object.keys(bundle).find((key) => key.endsWith("remoteEntry.js"));
        if (!entryKey || !bundle[entryKey]?.code) return;
        const cssFiles = Object.keys(bundle).filter((name) => name.endsWith(".css")).map((name) => name.split("/").pop());
        bundle[entryKey].code = bundle[entryKey].code.replace(/(["'`])__v__css__.*?\1/g, JSON.stringify(cssFiles));
      },
    },
  ],
  server: {
    port: 5001,
    strictPort: true,
  },
  preview: {
    port: 5001,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  build: {
    modulePreload: false,
    target: "esnext",
    minify: mode === "production",
    cssCodeSplit: false,
  },
}));
```

### 4.2 Autonomous Relative Routing Rule
Never hardcode parent URLs inside remote components. Define routes and links relatively:
```jsx
// packages/demoService/src/App.jsx
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/settings" element={<DemoSettingsPage />} />
</Routes>

// Inside remote views:
<Link to="settings">Module Settings</Link>
<Link to=".." relative="path">Back</Link>
```
When running standalone at `http://localhost:5001/`, this navigates to `/settings`.  
When embedded at `http://localhost:5000/demo/*`, it navigates to `/demo/settings`.

---

## 5. Cross-MFE Communication Layer (Event Bus)

Both applications import decoupled event utilities from `@mfe/shared`:

```javascript
export const MFE_EVENTS = {
  PING: "mfe:ping",
  PONG: "mfe:pong",
};

export function sendMfeEvent(eventName, payload = {}) {
  const event = new CustomEvent(eventName, {
    detail: {
      ...payload,
      timestamp: Date.now(),
      sender: window.__IS_HOST__ ? "Host Shell (Port 5000)" : "Demo Remote (Port 5001)",
    },
  });
  window.dispatchEvent(event);
}

export function useMfeEventListener(eventName, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (event instanceof CustomEvent && handler) handler(event.detail);
    };
    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
  }, [eventName, handler]);
}
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
# Compile and boot ONLY demoService alongside host; ignores other remotes
pnpm dev:only demoService
```
Enables instant local developer iteration without running multiple unnecessary micro-services on local machines.

### Production Build
```bash
pnpm build
```
Executes dynamic topological builds: builds all remotes in `remotes.manifest.json` first, followed by the `host` shell.

### Type Safety Verification
```bash
# Validates ambient contracts across remote module boundaries
pnpm typecheck
```

### Automated Testing & Coverage
```bash
# Run all unit and integration test suites (26 tests)
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
Runs `oxlint` across all workspace packages.

### Resetting to Clean Starter Mode
```bash
# Backup and remove demoService, applying clean starter templates
pnpm reset:demo

# Restore the demoService setup and configuration from backup
pnpm restore:demo
```

---

## 8. Adding a New Remote Micro-Frontend

Adding a new micro-frontend is manifest-driven and completely automated:

1. **Create Package**:
   ```bash
   mkdir packages/billingService
   cd packages/billingService
   pnpm init
   ```
2. **Install Core Dependencies**:
   ```bash
   pnpm --filter billingService add react react-dom react-router @mfe/shared
   pnpm --filter billingService add -D vite @vitejs/plugin-react @originjs/vite-plugin-federation @tailwindcss/vite tailwindcss oxlint
   ```
3. **Configure `vite.config.js`**:
   Set `name: "billingService"`, configure `port: 5002`, expose `./App`, and include `federation-css-fix`.
4. **Register in `remotes.manifest.json`**:
   ```json
   {
     "demoService": { ... },
     "billingService": {
       "port": 5002,
       "path": "/billing",
       "entry": "/assets/remoteEntry.js",
       "envVar": "VITE_BILLING_SERVICE_URL"
     }
   }
   ```
   > 💡 No manual editing of `host/vite.config.js` or root scripts is required!
5. **Mount in Host `src/App.jsx`**:
   ```jsx
   const BillingApp = React.lazy(() => import("billingService/App"));
   // ...
   <Route
     path="/billing/*"
     element={
       <RemoteErrorBoundary remoteName="Billing Service">
         <React.Suspense fallback={<LoadingFallback message="Streaming Billing Service..." />}>
           <BillingApp />
         </React.Suspense>
       </RemoteErrorBoundary>
     }
   />
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

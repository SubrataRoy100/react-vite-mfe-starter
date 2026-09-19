# Micro-Frontend Monorepo Starter Framework

A production-grade starter framework for **Micro-Frontends (MFE)** powered by **pnpm Workspaces**, **Turborepo**, **Module Federation 2.0 (`@module-federation/vite`)**, **React 19**, **React Router v8**, and **Tailwind CSS v4**.

Splits complex web applications into decoupled, independently deployable micro-frontends with live HMR, zero-touch dynamic routing, runtime URL overrides, type safety, and socket isolation.

---

## 📚 Core Documentation

- 🏛️ **[Architecture Specification](docs/ARCHITECTURE.md)**: Deep dive into Module Federation 2.0, Host Shell orchestration, route specificity sorting, and universal adapters.
- 💻 **[Development & Workflows Guide](docs/DEVELOPMENT_GUIDE.md)**: Local development workflows, targeted DX (`pnpm dev:only`), safe port guard, remote scaffolding (`pnpm mfe:create`), and repository garbage collection.
- ⚡ **[Runtime Configuration & Event Architecture](docs/RUNTIME_CONFIG_AND_EVENTS.md)**: Dynamic runtime remote URL injection (`window.__MFE_RUNTIME_CONFIG__`), type-safe cross-MFE event bus, and edge caching strategies.

---

## 🏗️ Architecture Overview

```text
mfe/ (Root Workspace)
├── .github/workflows/ci.yml       # GitHub Actions automated lint, typecheck, & build
├── turbo.json                     # Turborepo task pipeline & caching graph
├── remotes.manifest.json          # Single Source of Truth for all active micro-frontends
├── scripts/                       # Orchestration, code generation, and integrity tools
│   ├── orchestrate.js             # Dev and build concurrency coordinator
│   ├── manifest.js                # Manifest validator and command builder
│   ├── port-guard.js              # Safe listener-only socket inspector
│   ├── generate-remotes-dts.js    # Zero-touch route registry & ambient type generator
│   ├── create-remote.js           # Interactive / flag-based remote generator
│   ├── garbage-collector.js       # Monorepo dead code and drift auditor
│   ├── reset-demo.js              # Reset workspace to clean starter slate
│   └── restore-demo.js            # Restore demo services snapshot
│
├── packages/
│   ├── shared/                    # Core Library (@subrataroy100/mfe-shared)
│   │   ├── src/
│   │   │   ├── adapters/          # UniversalRemoteMount, Shadow DOM, dual-mode mounts
│   │   │   ├── events/            # Scoped Event Bus, pure JS core, React hooks
│   │   │   ├── vite/              # defineRemoteConfig preset + CSS auto-injection
│   │   │   ├── components/        # Shared UI primitives (Button)
│   │   │   ├── constants/         # Shared ports, origins, and configuration
│   │   │   └── index.js           # Barrel export
│   │   └── package.json           # Dual ESM/CJS exports with tracked .d.ts types
│   │
│   ├── host/                      # Primary Shell Container (Port 5000)
│   │   ├── src/
│   │   │   ├── components/        # Shell UI (RemoteErrorBoundary, LoadingFallback)
│   │   │   ├── pages/             # LandingPage dashboard and live event feed
│   │   │   ├── plugins/           # runtimeRemoteOverride.js (MF 2.0 runtime plugin)
│   │   │   ├── utils/             # resolveRemoteUrl.js (Dynamic runtime URL resolver)
│   │   │   ├── remotesRegistry.jsx# Auto-generated dynamic remote route registry
│   │   │   ├── remotes.d.ts       # Auto-generated ambient TypeScript declarations
│   │   │   ├── App.jsx            # Dynamic routing & error boundaries
│   │   │   └── main.jsx           # Entry point (sets window.__IS_HOST__)
│   │   └── vite.config.js         # Federation consumer configuration
│   │
│   └── [remoteServices...]/       # Active micro-frontends (e.g. marketingMfe, authMfe)
│
├── docs/                          # Architectural and operational guides
├── netlify.toml                   # Edge headers (remoteEntry no-cache, assets immutable)
├── vercel.json                    # Edge headers (remoteEntry no-cache, assets immutable)
├── package.json                   # Root scripts and workspace devDependencies
└── pnpm-workspace.yaml            # Monorepo package directories
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: `>= 20.0.0`
- **pnpm**: `12.x` (enforced via `devEngines` & `packageManager`)

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
1. **Runs Safe Port Guard**: Checks and frees orphaned background sockets on configured ports (5000, 5002, 5003...).
2. **Generates Route Registry & Types**: Reads `remotes.manifest.json` and updates `packages/host/src/remotesRegistry.jsx` and `remotes.d.ts`.
3. **Boots Dev Servers Concurrently**: Starts the host shell and each registered remote with live Vite HMR.

Open **[http://localhost:5000](http://localhost:5000)** in your browser to view the Host dashboard.

---

## 🎯 Key Features & Capabilities

### 1. Live Hot Module Replacement (HMR) for Remotes
Micro-frontends run standard Vite dev servers using Module Federation 2.0 (`dev: { remoteHmr: true }`). Edits to remote components appear instantly inside the running host application without requiring full rebuilds or browser reloads.

### 2. Targeted DX (`pnpm dev:only`)
Avoid running every remote simultaneously when working on a single feature:
```bash
# Boots only the Host Shell (port 5000) and marketingMfe (port 5002)
pnpm dev:only marketingMfe
```

### 3. Zero-Touch Dynamic Route Registry
No manual router editing is needed when adding or removing micro-frontends:
- Manifest entries in `remotes.manifest.json` are automatically converted into lazy-loaded routes in `remotesRegistry.jsx`.
- **Specificity Sorting**: Deeper and explicit routes (e.g., `/marketing/features/*`, `/auth/*`) are automatically mounted before shallow paths (`/*`), preventing wildcard hijacking.
- **Isolated Error Boundaries**: Every remote route is wrapped in `<RemoteErrorBoundary>` and Suspense fallbacks. If a remote fails or throws an unhandled error, the Host navigation and sibling remotes remain completely unaffected.

### 4. Dynamic Runtime Remote URL Overrides (`window.__MFE_RUNTIME_CONFIG__`)
Deploy remotes independently to staging or CDN environments without rebuilding the host shell container:
```html
<script>
  window.__MFE_RUNTIME_CONFIG__ = {
    marketingMfe: "https://staging-cdn.example.com/marketing/mf-manifest.json",
    authMfe: "https://staging-cdn.example.com/auth/mf-manifest.json"
  };
</script>
```
The Host's Module Federation 2.0 runtime plugin intercepts requests dynamically in the browser. Build-time defaults in `.env` (`VITE_MARKETING_MFE_URL`) are read automatically via `loadEnv()`.

### 5. Decoupled Cross-MFE Event Bus
Micro-frontends communicate asynchronously without shared global stores:
```javascript
import { createMfeEventBus } from "@subrataroy100/mfe-shared/events";

// Scoped event bus
const bus = createMfeEventBus({ sender: "authMfe", namespace: "auth" });
bus.send("user:login", { userId: "usr_100" });

// React Hook with automatic lifecycle unmount cleanup
bus.useListener("user:logout", (detail) => {
  console.log("Logged out:", detail);
});
```

### 6. One-Command Remote Scaffolding (`pnpm mfe:create`)
Scaffold a complete, fully connected micro-frontend with auto-allocated ports in one command:
```bash
pnpm mfe:create billingService --path /billing --framework react
```

---

## 🛠️ Monorepo Scripts Reference

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Runs port guard, generates registry & types, then launches host and remotes with live HMR. |
| `pnpm dev:only <name>` | Targeted DX: Boots **only** the Host Shell and a specific Remote (e.g. `pnpm dev:only marketingMfe`). |
| `pnpm mfe:create <name>` | Scaffolds a new remote package, auto-allocates port, updates manifest, and mounts routes. |
| `pnpm clean:ports` | Safely detects and terminates orphaned listeners on configured MFE ports. |
| `pnpm build` | Production build across all packages using **Turborepo** with outputs caching. |
| `pnpm build:remotes` | Builds all remote micro-frontends using Turborepo (`turbo run build --filter=!host`). |
| `pnpm build:host` | Builds the host shell container (`turbo run build --filter=host`). |
| `pnpm remotes:list` | Prints a summary table of all active remotes configured in `remotes.manifest.json`. |
| `pnpm typecheck` | Generates types and validates TypeScript definitions across workspaces and tests. |
| `pnpm test` | Runs all unit and integration tests via Vitest. |
| `pnpm test:watch` | Runs Vitest in interactive watch mode. |
| `pnpm test:coverage` | Generates full test coverage report via `@vitest/coverage-v8`. |
| `pnpm lint` | Runs `oxlint` across all workspace packages via Turborepo. |
| `pnpm preview` | Serves the production build of the host shell. |
| `pnpm reset:demo` | Resets workspace to clean starter slate (backs up demo remotes to `.demo-backup/`). |
| `pnpm restore:demo` | Restores demo micro-frontends from `.demo-backup/`. |
| `pnpm gc` | Runs the monorepo Garbage Collector to audit drift, dead code, and stale artifacts. |
| `pnpm gc:check` | Non-destructive CI check for repo consistency and orphan configurations. |
| `pnpm gc:fix` | Automatically remedies detected monorepo drift and cleans stale entries. |

---

## 🌐 Production Deployment & HTTP Caching

For optimal CDN performance and instant updates:
- **`remoteEntry.js` / `mf-manifest.json`**: Must never be cached (`Cache-Control: no-cache, no-store, must-revalidate`).
- **Hashed Assets (`/assets/*`)**: Cached permanently with max immutable lifetimes (`Cache-Control: public, max-age=31536000, immutable`).

Pre-configured headers are included for:
- **Netlify**: [`netlify.toml`](netlify.toml)
- **Vercel**: [`vercel.json`](vercel.json)

---

## 📄 License

[MIT](LICENSE) © Subrata Roy

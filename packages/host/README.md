# Host Application Shell (`packages/host`)

The primary container application for the Micro-Frontend Monorepo architecture.

## Overview
- **Role**: Main application container, shell layout, global navigation, and error boundary isolation.
- **Port**: `5000`
- **Tech Stack**: React 19, React Router v8, Tailwind CSS v4, Vite 8, Module Federation.

---

## Key Features

1. **Dynamic Manifest-Driven Federation**:
   - Reads `remotes.manifest.json` at build time to dynamically wire remotes into Module Federation without hardcoded configuration.
   - Supports runtime URL overrides via `window.__MFE_RUNTIME_CONFIG__` without rebuilding (see [Runtime Configuration Guide](../../docs/RUNTIME_CONFIGURATION.md)).

2. **Fault Isolation (`<RemoteErrorBoundary>`)**:
   - Every remote route is wrapped in an isolated boundary with Suspense fallbacks.
   - If a remote fails to load or crashes at runtime, the host shell and navigation remain 100% operational.

3. **Multi-Framework Hosting (`<UniversalRemoteMount>`)**:
   - Can mount both native React components and non-React remotes (Vue 3, Svelte 5, SolidJS, Vanilla JS) via `@mfe/shared`.

4. **Cross-MFE Event Bus Monitoring**:
   - Receives events (`mfe:ping`, `mfe:notification`) emitted by remotes and displays them in the live Host Event Feed.

---

## Development & Scripts

Inside `packages/host`:
- `pnpm dev`: Runs the host development server on `http://localhost:5000`.
- `pnpm build`: Bundles the host container for production using Vite 8.
- `pnpm preview`: Serves the production build.
- `pnpm lint`: Runs `oxlint`.
- `pnpm typecheck`: Validates TypeScript definitions via `tsc --noEmit`.

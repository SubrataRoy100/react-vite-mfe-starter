# Demo Service Remote (`packages/demoService`)

An independent micro-frontend remote application demonstrating federated modules, autonomous routing, and cross-boundary diagnostics.

## Overview
- **Role**: Sample remote micro-app and interactive diagnostics playground.
- **Port**: `5001`
- **Tech Stack**: React 19, React Router v8, Tailwind CSS v4, Vite 8, `@originjs/vite-plugin-federation`.
- **Configured via**: `defineRemoteConfig` from `@mfe/shared/vite`.

---

## Exposed Modules

Declared in [`vite.config.js`](./vite.config.js):

| Exposed Key | Source File | Description |
| :--- | :--- | :--- |
| **`./App`** | `src/App.jsx` | The full sub-site application mounted inside the host shell or viewed standalone. |
| **`./MfeDevWidget`** | `src/components/MfeDevWidget.jsx` | Diagnostic widget for runtime context detection, cross-MFE ping/pong, and error isolation testing. |

---

## Dual Execution Modes

1. **Standalone Mode (`http://localhost:5001`)**:
   - Runs independently with its own dev server entry point (`src/main.jsx`).
   - Uses relative routing (`/` and `/settings`) so it does not depend on host route prefixes.

2. **Embedded in Host Shell (`http://localhost:5000/demo/*`)**:
   - Loaded dynamically into the Host shell container via Module Federation.
   - The `<MfeDevWidget>` automatically detects execution context and reflects whether it is embedded or standalone.

---

## Development & Scripts

Inside `packages/demoService`:
- `pnpm dev`: Runs the standalone Vite dev server on `http://localhost:5001`.
- `pnpm build`: Compiles production bundle to `dist/` with `remoteEntry.js`.
- `pnpm watch`: Continuously rebuilds during development orchestration.
- `pnpm preview`: Serves production preview on port `5001` with CORS headers.
- `pnpm lint`: Runs `oxlint`.
- `pnpm typecheck`: Validates TypeScript definitions via `tsc --noEmit`.

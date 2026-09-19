# Marketing Micro-Frontend (`packages/marketingMfe`)

The marketing and landing micro-frontend service for the CampusMind Web platform.

## Overview
- **Port**: `5002`
- **Route Prefix**: `/landing`
- **Exposed Modules**: `./App`
- **Framework**: React 19 + React Router v8 + Tailwind CSS v4
- **Federation Engine**: `@module-federation/vite` via `defineRemoteConfig`

---

## Features
- Independent standalone execution at `http://localhost:5002`
- Federated mounting in Host container at `http://localhost:5000/landing`
- Cross-MFE Event Bus integration (`mfe:ping` / `mfe:pong`)
- Autonomous relative routing (`/` and sub-paths)
- Localized error boundaries and loading fallbacks

---

## Development & Scripts
- `pnpm --filter marketingMfe dev`: Runs standalone dev server with HMR.
- `pnpm --filter marketingMfe build`: Builds remote production bundle including `remoteEntry.js`.
- `pnpm --filter marketingMfe preview`: Serves production preview server on port 5002.
- `pnpm --filter marketingMfe lint`: Runs `oxlint`.
- `pnpm --filter marketingMfe typecheck`: Type check with `tsc --noEmit`.

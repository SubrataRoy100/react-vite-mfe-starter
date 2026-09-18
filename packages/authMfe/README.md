# Authentication Micro-Frontend (`packages/authMfe`)

The authentication and authorization micro-frontend service for the CampusMind Web platform.

## Overview
- **Port**: `5003`
- **Route Prefix**: `/auth`
- **Exposed Modules**: `./App`
- **Framework**: React 19 + React Router v8 + Tailwind CSS v4
- **Federation Engine**: `@module-federation/vite` via `defineRemoteConfig`

---

## Features
- Independent standalone execution at `http://localhost:5003`
- Federated mounting in Host container at `http://localhost:5000/auth`
- Cross-MFE Event Bus integration
- Autonomous relative routing (`/` and auth sub-paths)
- Localized error boundaries and loading fallbacks

---

## Development & Scripts
- `pnpm --filter authMfe dev`: Runs standalone dev server with HMR.
- `pnpm --filter authMfe build`: Builds remote production bundle including `remoteEntry.js`.
- `pnpm --filter authMfe preview`: Serves production preview server on port 5003.
- `pnpm --filter authMfe lint`: Runs `oxlint`.
- `pnpm --filter authMfe typecheck`: Type check with `tsc --noEmit`.

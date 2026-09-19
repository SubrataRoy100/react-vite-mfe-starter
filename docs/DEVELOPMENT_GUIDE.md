# Developer Experience & Workflows Guide

This guide details day-to-day developer operations, automated scaffolding, live Hot Module Replacement (HMR), socket management, and codebase integrity utilities.

---

## 1. Prerequisites & Quick Start

- **Node.js**: `>= 20.0.0`
- **pnpm**: `12.x` (managed via `packageManager: "pnpm@12.4.2"`)

```bash
# Clone and install dependencies
pnpm install

# Start the full development environment
pnpm dev
```

### What `pnpm dev` Does Under the Hood:
1. **Runs Port Guard (`scripts/port-guard.js`):** Pre-checks all configured ports (Host: 5000, remotes: 5002, 5003...) and safely terminates orphaned listeners.
2. **Generates TypeScript & Route Registry (`scripts/generate-remotes-dts.js`):** Automatically reads `remotes.manifest.json` and updates `packages/host/src/remotesRegistry.jsx` and `remotes.d.ts`.
3. **Launches Concurrent Dev Servers:** Boots the host and each active remote simultaneously with live Vite HMR.

---

## 2. Targeted Development (`pnpm dev:only`)

In larger applications with dozens of micro-frontends, running all services simultaneously consumes excessive CPU and RAM. Use targeted mode to boot only the host shell and the remote you are actively developing:

```bash
# Boots Host Shell (port 5000) + marketingMfe (port 5002) only
pnpm dev:only marketingMfe
```

The orchestrator reads `remotes.manifest.json`, isolates the target remote, runs port guard for those specific ports, and starts only those two processes.

---

## 3. Live Hot Module Replacement (HMR)

Remotes use Module Federation 2.0 with native Vite HMR enabled:
```javascript
// packages/shared/src/vite/defineRemoteConfig.js
dev: {
  remoteHmr: true,
}
```

When you edit a remote's component (e.g. `packages/marketingMfe/src/App.jsx`), Vite pushes the updated module over WebSockets directly into the host browser session—**without full page reloads and without rebuilding remote bundles**.

---

## 4. Safe Socket Management (`scripts/port-guard.js`)

Unlike naive scripts that run `kill -9` against any process matching a port number, our Port Guard guarantees safe execution:

1. **Listener-Only Filtering:**
   - **POSIX (macOS / Linux):** Uses `lsof -ti tcp:<port> -sTCP:LISTEN` to ensure only socket listeners are targeted, completely ignoring active browser or client outbound connections.
   - **Windows:** Queries `Get-NetTCPConnection -LocalPort <port> -State Listen` via PowerShell.
2. **Graceful Escalation:**
   Attempts graceful termination (`SIGTERM` / `kill -15`) first, allowing servers to close connections cleanly before falling back to `SIGKILL` (`kill -9`).
3. **macOS AirPlay Detection:**
   Port 5000 is used by default for the Host shell. On macOS Monterey and later, Apple's AirPlay Receiver (`ControlCenter`) listens on port 5000 by default. Port Guard detects `ControlCenter`, logs an explanatory warning, and skips killing macOS system services.

Run port guard manually at any time:
```bash
pnpm clean:ports
```

---

## 5. One-Command Remote Generator (`pnpm mfe:create`)

Scaffold a new, fully connected micro-frontend with zero manual setup:

```bash
pnpm mfe:create <serviceName> [--path </route>] [--framework <react|vue|vanilla>]
```

### Example:
```bash
pnpm mfe:create billingService --path /billing --framework react
```

### Automated Actions:
- Creates `packages/billingService/` with Vite, React 19, and Tailwind CSS v4.
- Auto-allocates the next unused port (e.g., 5004).
- Registers the service in `remotes.manifest.json`.
- Runs `scripts/generate-remotes-dts.js` to immediately update host routing and TypeScript contracts.
- You can immediately run `pnpm dev:only billingService` to start developing!

---

## 6. Monorepo Garbage Collector (`pnpm gc`)

The Garbage Collector audits the repository for orphan configurations, dead code, stale registry entries, and phantom dependencies.

```bash
# Check for drift, orphaned files, and dead code without modifying files
pnpm gc:check

# Interactive audit and guided cleanup
pnpm gc

# Automatic remediation and removal of stale artifacts
pnpm gc:fix
```

### What It Audits:
- Unused services present in `packages/` but missing from `remotes.manifest.json`.
- Dangling manifest entries pointing to nonexistent directories.
- Stale route registrations in `remotesRegistry.jsx`.
- Ghost environment variables in `.env` files.
- Backup files (`.demo-backup/`, `.gc-backup/`) and dead documentation references.

---

## 7. Workspace Reset and Demo Restoration

To return the monorepo to an empty, clean starter slate (removing demo remotes and leaving only host shell + shared library):

```bash
# Backs up demo services to .demo-backup/ and cleans the workspace
pnpm reset:demo

# Restore the original demo remotes at any time
pnpm restore:demo
```

Both scripts automatically regenerate host route registries, manifest files, and TypeScript ambient types.

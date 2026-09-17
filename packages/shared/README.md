# @subrataroy100/mfe-shared

Cross-micro-frontend event bus, Universal Adapters for multi-framework federation, configuration constants, and centralized Vite federation preset.

Designed for micro-frontend architectures powered by Vite and Module Federation.

[![npm version](https://img.shields.io/npm/v/@subrataroy100/mfe-shared.svg)](https://www.npmjs.com/package/@subrataroy100/mfe-shared)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Installation

```bash
# Using pnpm
pnpm add @subrataroy100/mfe-shared

# Using npm
npm install @subrataroy100/mfe-shared

# Using yarn
yarn add @subrataroy100/mfe-shared
```

Within this monorepo workspace:
```json
"dependencies": {
  "@subrataroy100/mfe-shared": "workspace:*"
}
```

---

## Features & Modules

### 1. Centralized Vite Preset (`@subrataroy100/mfe-shared/vite`)

Drastically reduces remote `vite.config.js` boilerplate from ~75 lines to ~10 lines while ensuring proper singleton sharing and manifest integration.

```javascript
import { defineRemoteConfig } from "@subrataroy100/mfe-shared/vite";

export default defineRemoteConfig({
  name: "myService",
  // Port is auto-inferred from remotes.manifest.json, or can be passed directly:
  // port: 5002,
  // Supports "react" (default), "vue", "svelte", "solid", "vanilla", or "none":
  framework: "react",
  exposes: {
    "./App": "./src/App.jsx",
  },
});
```

#### Supported Options:
- **`name`** *(string, required)*: Federation container name.
- **`port`** *(number, optional)*: Dev/preview server port (inferred from `remotes.manifest.json` if omitted).
- **`framework`** *(string, optional)*: `"react"` (default), `"vue"`, `"svelte"`, `"solid"`, `"vanilla"`, or `"none"`.
- **`frameworkPlugin`**: Provide framework bundler plugin (e.g. `vue()`, `svelte()`, `solid()`).
- **`shared`**: Extend or override shared dependency singletons (preserves React 19 defaults).
- **`plugins`**: Append custom Vite plugins (e.g. `svgr()`).
- **`tailwind`**: Toggle Tailwind CSS v4 integration (`true` by default; set `tailwind: false` to opt-out).
- **`manifestPath`**: Custom path to `remotes.manifest.json`.
- **`extend(config, env)`**: Programmatic escape hatch hook to inspect or mutate the final Vite configuration.

---

### 2. Universal Adapters (`@subrataroy100/mfe-shared/adapters` or `@subrataroy100/mfe-shared`)

Allows the Host container to load and mount micro-frontends written in **any framework** (React 19, Vue 3, Svelte 5, SolidJS, Vanilla JS) into the DOM safely:

```jsx
import { UniversalRemoteMount } from "@subrataroy100/mfe-shared";

<UniversalRemoteMount
  loadRemote={() => import("vueService/mount")}
  props={{ userId: 123 }}
  remoteName="Vue Sub-App"
  fallback={<div>Loading Vue Sub-App...</div>}
/>
```

#### Lifecycle Helpers:
- **`createReactMount(Component)`**: Converts any React component into a `{ mount, update, unmount }` lifecycle export.
- **`createVanillaMount(renderFn)`**: Converts any plain JavaScript render function into a `{ mount, update, unmount }` lifecycle export.
- **`useMfeEventListener(eventName, handler)`**: React hook for listening to event bus messages with automatic lifecycle cleanup and stable handler ref.

---

### 3. Decoupled Cross-MFE Event Bus (`@subrataroy100/mfe-shared/events` or `@subrataroy100/mfe-shared`)

Pure native DOM `CustomEvent` messaging that works identically across all frameworks without coupling to any state management library:

```javascript
import { sendMfeEvent, listenMfeEvent, useMfeEventListener, MFE_EVENTS } from "@subrataroy100/mfe-shared";

// 1. Dispatch an event from any micro-frontend
sendMfeEvent(MFE_EVENTS.PING, { message: "Hello from micro-frontend!" });

// 2. Listen in non-React frameworks (Vue, Svelte, Vanilla) with unsubscribe:
const unsubscribe = listenMfeEvent(MFE_EVENTS.PING, (payload) => {
  console.log("Received ping:", payload);
});
// When component unmounts:
unsubscribe();

// 3. Listen in React components with automated cleanup hook:
useMfeEventListener(MFE_EVENTS.PONG, (payload) => {
  console.log("Received pong in React:", payload);
});
```

---

### 4. Shared UI Components (`@subrataroy100/mfe-shared/components/Button`)

Pre-styled UI primitives shared across applications:

```jsx
import { Button } from "@subrataroy100/mfe-shared";
// or direct subpath:
import Button from "@subrataroy100/mfe-shared/components/Button";

<Button variant="primary" onClick={handleClick}>Click Me</Button>
```

---

## License

[MIT](LICENSE) © SubrataRoy100

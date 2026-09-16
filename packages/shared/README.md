# @mfe/shared

Internal monorepo workspace package providing common utilities, cross-micro-frontend event bus messaging, configuration constants, Universal Adapters for multi-framework support, and the centralized Vite remote configuration preset.

## Installation

In any workspace package:

```json
"dependencies": {
  "@mfe/shared": "workspace:*"
}
```

---

## Features & Modules

### 1. Centralized Vite Preset (`@mfe/shared/vite`)

Drastically reduces remote `vite.config.js` boilerplate from ~75 lines to ~10 lines.

```javascript
import { defineRemoteConfig } from "@mfe/shared/vite";

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

#### Supported Customizations:
- **`frameworkPlugin`**: Provide framework bundler plugin (e.g. `vue()`, `svelte()`, `solid()`).
- **`shared`**: Extend or override shared dependency singletons (preserves React 19 defaults).
- **`plugins`**: Append custom Vite plugins (e.g. `svgr()`).
- **`tailwind`**: Toggle Tailwind CSS v4 integration (`true` by default; set `tailwind: false` to opt-out).
- **`manifestPath`**: Custom path to `remotes.manifest.json`.
- **`extend(config, env)`**: Programmatic escape hatch hook to inspect or mutate the final Vite configuration.

---

### 2. Universal Adapters (`@mfe/shared/adapters` or `@mfe/shared`)

Allows the Host container to load and mount micro-frontends written in **any framework** (React 19, Vue 3, Svelte 5, SolidJS, Vanilla JS) into the DOM safely:

```jsx
import { UniversalRemoteMount } from "@mfe/shared";

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

---

### 3. Decoupled Cross-MFE Event Bus (`@mfe/shared/events` or `@mfe/shared`)

Pure native DOM `CustomEvent` messaging that works identically across all frameworks:

```javascript
import { sendMfeEvent, listenMfeEvent, useMfeEventListener, MFE_EVENTS } from "@mfe/shared";

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

### 4. Shared UI Components (`@mfe/shared/components/Button`)

Pre-styled UI primitives shared across applications:

```jsx
import { Button } from "@mfe/shared";

<Button variant="primary" onClick={handleClick}>Click Me</Button>
```

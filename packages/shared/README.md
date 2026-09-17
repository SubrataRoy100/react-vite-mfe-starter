# @subrataroy100/mfe-shared

Cross-micro-frontend event bus, Universal Adapters for multi-framework federation, Shadow DOM isolation, configuration constants, and centralized Vite federation preset.

Designed for production Micro-Frontend architectures powered by Vite and Module Federation.

[![npm version](https://img.shields.io/npm/v/@subrataroy100/mfe-shared.svg)](https://www.npmjs.com/package/@subrataroy100/mfe-shared)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

> 📖 **Full Step-by-Step Tutorial**: For an end-to-end walkthrough on building a Host and Remote with Vite from scratch, check out the **[In-Depth Getting Started Guide](../../docs/NPM_GETTING_STARTED.md)**.

## 📦 Installation

Install directly from npm:

```bash
# Using npm
npm install @subrataroy100/mfe-shared

# Using pnpm
pnpm add @subrataroy100/mfe-shared

# Using yarn
yarn add @subrataroy100/mfe-shared
```

Within a monorepo workspace:
```json
"dependencies": {
  "@subrataroy100/mfe-shared": "workspace:*"
}
```

---

## 🚀 Quick Subpath Imports

| Subpath | Description | Use Case |
| :--- | :--- | :--- |
| `@subrataroy100/mfe-shared` | Top-level barrel export | Everything: Event Bus, Adapters, Constants, Primitives |
| `@subrataroy100/mfe-shared/events` | Event Bus + React Hook | Scoped & global event bus with `useListener` hook |
| `@subrataroy100/mfe-shared/events/core` | Pure JS Event Bus | **Zero dependencies**, no React runtime (Vue, Svelte, Vanilla) |
| `@subrataroy100/mfe-shared/adapters` | Universal Remote Mount & Adapters | Dual-mode React mounts, Shadow DOM isolation, teardown |
| `@subrataroy100/mfe-shared/vite` | Vite Federation Preset | Centralized `defineRemoteConfig` + CSS auto-injection |
| `@subrataroy100/mfe-shared/components/Button` | Shared UI Primitive | Pre-styled Tailwind button with variants |
| `@subrataroy100/mfe-shared/constants` | Shared Ports & Config | Standard ports, origins, and event constants |

---

## 🛠️ Key Features & API Guide

### 1. Centralized Vite Preset (`@subrataroy100/mfe-shared/vite`)

Eliminates boilerplate in remote `vite.config.js` while ensuring:
- Deterministic singleton sharing (`react`, `react-dom`, `@subrataroy100/mfe-shared`) without duplicate instances.
- **Automatic CSS Injection (`federationCssFixPlugin`)**: Injects remote CSS chunk `<link>` tags into the DOM when remotes load.
- Dynamic manifest port inference and deep-merging of custom shared dependencies via `mergeSharedDeps`.

```javascript
// vite.config.js in Remote MFE
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { defineRemoteConfig } from "@subrataroy100/mfe-shared/vite";

export default defineConfig(
  defineRemoteConfig({
    name: "cartService",
    port: 5001,               // Inferred from remotes.manifest.json if omitted
    framework: "react",       // "react" (default), "vue", "svelte", "solid", "vanilla", "none"
    exposes: {
      "./App": "./src/App.jsx",
      "./Widget": "./src/Widget.jsx",
    },
    // Optional: add extra singletons or overrides (React singletons preserved)
    shared: {
      zustand: { singleton: true },
    },
    plugins: [react()],
  })
);
```

---

### 2. Decoupled & Scoped Event Bus (`@subrataroy100/mfe-shared/events`)

Prevent event collisions across multiple remotes and teams in the same window. Dispatches native browser `CustomEvent` instances enriched with metadata (`sender`, `namespace`, `timestamp`).

#### A. Scoped Event Bus Factory (`createMfeEventBus`)
```typescript
import { createMfeEventBus } from "@subrataroy100/mfe-shared/events";

// Instantiate a bus scoped to a team/feature
export const cartBus = createMfeEventBus({
  sender: "cart-remote",
  namespace: "team-checkout",
});

// 1. Dispatch an event (broadcast as 'team-checkout:item:added')
cartBus.send("item:added", { id: "p1", name: "Laptop", price: 1200 });

// 2. React Hook: Automatically subscribes and unmounts cleanly
function CartWidget() {
  cartBus.useListener("item:added", (event) => {
    console.log("Sender:", event.detail.sender);       // "cart-remote"
    console.log("Namespace:", event.detail.namespace); // "team-checkout"
    console.log("Payload:", event.detail.data);        // { id: "p1", ... }
  });

  return <div>Cart Ready</div>;
}

// 3. Imperative subscription (Non-React / Vanilla JS):
const unsubscribe = cartBus.listen("item:added", (event) => {
  console.log("Added:", event.detail.data);
});
// When done:
unsubscribe();
```

#### B. Zero-Dependency Core for Non-React Remotes (`events/core`)
For Vue, Svelte, Solid, or Vanilla JS remotes that do not want to bundle React:
```javascript
import { createMfeEventBus } from "@subrataroy100/mfe-shared/events/core";

const bus = createMfeEventBus({ sender: "vue-subapp" });
bus.send("search:query", { term: "microfrontends" });
```

#### C. Strong Typing with Module Augmentation
Extend the global event registry in your project's `.d.ts`:
```typescript
import "@subrataroy100/mfe-shared";

declare module "@subrataroy100/mfe-shared" {
  interface MfeEventRegistry {
    "team-checkout:item:added": { id: string; name: string; price: number };
    "auth:user-logged-in": { userId: string; role: string };
  }
}
```

---

### 3. Universal Remote Mount & Adapters (`@subrataroy100/mfe-shared/adapters`)

Mount any micro-frontend safely inside the Host container regardless of framework.

#### A. Host Container Loading (`<UniversalRemoteMount>`)
Loads both `{ mount }` lifecycle contracts and direct React components. Supports **Shadow DOM style isolation** and safe React 19 microtask teardown:

```jsx
import React from "react";
import { UniversalRemoteMount } from "@subrataroy100/mfe-shared/adapters";

export function HostPage() {
  return (
    <UniversalRemoteMount
      module={() => import("cartRemote/App")}
      props={{ theme: "dark", userId: "u42" }}
      // Opt-in to complete CSS encapsulation via Shadow DOM:
      shadowDom={{ mode: "open" }}
      fallback={<div>Loading Cart Remote...</div>}
      errorFallback={(error) => (
        <div className="error">Failed to mount cart: {error.message}</div>
      )}
    />
  );
}
```

#### B. Dual-Mode React Mount (`createReactMount`)
Allows a remote component to be imported **both directly in JSX** and **via DOM lifecycle mounting**:

```jsx
import React from "react";
import { createReactMount } from "@subrataroy100/mfe-shared/adapters";

function MyFeature({ title }) {
  return <div className="feature-card">{title}</div>;
}

// Returns a dual-mode component:
const MountableFeature = createReactMount(MyFeature);

// 1. Can be used in JSX:
// <MountableFeature title="Analytics" />

// 2. Can be mounted imperatively into any DOM node:
// const unmount = MountableFeature.mount(document.getElementById("slot"), { title: "Analytics" });

export default MountableFeature;
```

#### C. Vanilla JS Mount (`createVanillaMount`)
```javascript
import { createVanillaMount } from "@subrataroy100/mfe-shared/adapters";

export default createVanillaMount((container, props) => {
  container.innerHTML = `<h3>Hello ${props.name}</h3>`;
  return () => {
    container.innerHTML = ""; // Teardown cleanup
  };
});
```

---

### 4. Shared UI Primitives (`@subrataroy100/mfe-shared/components/Button`)

Accessible, pre-styled Tailwind CSS button supporting standard variants:

```jsx
import Button from "@subrataroy100/mfe-shared/components/Button";

<Button variant="primary" onClick={() => console.log("clicked")}>
  Primary Action
</Button>
<Button variant="secondary" size="sm">Secondary</Button>
<Button variant="danger" size="lg">Delete</Button>
```

---

## 📄 License

[MIT](LICENSE) © Subrata Roy

# Multi-Framework Micro-Frontend Architecture Guide

This monorepo supports micro-frontends built in **any frontend framework**:
* **React 19**
* **Vue 3**
* **Svelte 5**
* **SolidJS**
* **Vanilla JS / Web Components**
* **Angular**

All remotes coexist in the same workspace, participate in automated dev/build orchestration, communicate via the decoupled Cross-MFE Event Bus, and mount smoothly into the Host Container.

### Framework Support & Testing Status

| Framework | Universal Mount Contract | Status in Monorepo | CI Verification |
| :--- | :--- | :--- | :--- |
| **React 19** | Native component or `{ mount }` | **Active & Tested** (`demoService`, `host`) | Verified in test suite & build |
| **Vanilla JS / Web Components** | `{ mount, unmount }` | **Active & Tested** (`createVanillaMount`, `UniversalRemoteMount`) | Verified in test suite |
| **Vue 3** | `{ mount, unmount }` | **Documented Specification** (`defineRemoteConfig({ framework: "vue" })`) | Documented, untested in default workspace |
| **Svelte 5** | `{ mount, unmount }` | **Documented Specification** (`defineRemoteConfig({ framework: "svelte" })`) | Documented, untested in default workspace |
| **SolidJS** | `{ mount, unmount }` | **Documented Specification** (`defineRemoteConfig({ framework: "solid" })`) | Documented, untested in default workspace |

---

## 1. Core Architecture: Universal DOM Mount Contract

Instead of coupling remotes to a specific framework runtime (like exporting a raw React JSX component), remotes can expose a **Universal DOM Lifecycle Contract**:

```typescript
export interface MfeLifecycle {
  mount: (container: HTMLElement, props?: Record<string, any>) => (() => void) | void;
  unmount?: (container: HTMLElement) => void;
}
```

Any host application (React, Vue, etc.) can load and mount this contract simply by providing a target DOM element.

---

## 2. Framework Recipes

### A. React 19 Remote
React remotes can either expose a native component or a universal mount:

**`packages/reactService/vite.config.js`**:
```javascript
import { defineRemoteConfig } from "@mfe/shared/vite";

export default defineRemoteConfig({
  name: "reactService",
  framework: "react", // default
  exposes: {
    "./App": "./src/App.jsx",
  },
});
```

---

### B. Vue 3 Remote

1. **Install Vue 3**:
   ```bash
   pnpm --filter vueService add vue
   pnpm --filter vueService add -D @vitejs/plugin-vue
   ```

2. **Configure `vite.config.js`**:
   ```javascript
   import { defineRemoteConfig } from "@mfe/shared/vite";
   import vue from "@vitejs/plugin-vue";

   export default defineRemoteConfig({
     name: "vueService",
     framework: "vue",
     frameworkPlugin: vue(),
     exposes: {
       "./mount": "./src/mount.js",
     },
   });
   ```

3. **Expose Universal Mount (`src/mount.js`)**:
   ```javascript
   import { createApp } from "vue";
   import App from "./App.vue";

   export function mount(container, props = {}) {
     const app = createApp(App, props);
     app.mount(container);

     // Return unmount cleanup
     return () => app.unmount();
   }
   ```

---

### C. Svelte 5 Remote

1. **Install Svelte 5**:
   ```bash
   pnpm --filter svelteService add svelte
   pnpm --filter svelteService add -D @sveltejs/vite-plugin-svelte
   ```

2. **Configure `vite.config.js`**:
   ```javascript
   import { defineRemoteConfig } from "@mfe/shared/vite";
   import { svelte } from "@sveltejs/vite-plugin-svelte";

   export default defineRemoteConfig({
     name: "svelteService",
     framework: "svelte",
     frameworkPlugin: svelte(),
     exposes: {
       "./mount": "./src/mount.js",
     },
   });
   ```

3. **Expose Universal Mount (`src/mount.js`)**:
   ```javascript
   import { mount as svelteMount, unmount as svelteUnmount } from "svelte";
   import App from "./App.svelte";

   export function mount(container, props = {}) {
     const instance = svelteMount(App, { target: container, props });
     return () => svelteUnmount(instance);
   }
   ```

---

### D. SolidJS Remote

1. **Install SolidJS**:
   ```bash
   pnpm --filter solidService add solid-js
   pnpm --filter solidService add -D vite-plugin-solid
   ```

2. **Configure `vite.config.js`**:
   ```javascript
   import { defineRemoteConfig } from "@mfe/shared/vite";
   import solid from "vite-plugin-solid";

   export default defineRemoteConfig({
     name: "solidService",
     framework: "solid",
     frameworkPlugin: solid(),
     exposes: {
       "./mount": "./src/mount.js",
     },
   });
   ```

3. **Expose Universal Mount (`src/mount.js`)**:
   ```javascript
   import { render } from "solid-js/web";
   import App from "./App";

   export function mount(container, props = {}) {
     const dispose = render(() => <App {...props} />, container);
     return () => dispose();
   }
   ```

---

### E. Vanilla JS / Web Components Remote

1. **Configure `vite.config.js`**:
   ```javascript
   import { defineRemoteConfig } from "@mfe/shared/vite";

   export default defineRemoteConfig({
     name: "vanillaService",
     framework: "vanilla",
     exposes: {
       "./mount": "./src/mount.js",
     },
   });
   ```

2. **Expose Universal Mount (`src/mount.js`)**:
   ```javascript
   import { createVanillaMount } from "@mfe/shared/adapters";

   export const { mount } = createVanillaMount((container, props) => {
     container.innerHTML = `
       <div class="p-6 bg-slate-900 text-white rounded-xl">
         <h2 class="text-xl font-bold">${props.title || "Vanilla Micro-App"}</h2>
         <p>Running autonomously without a frontend framework runtime.</p>
       </div>
     `;

     return () => {
       container.innerHTML = "";
     };
   });
   ```

---

## 3. Mounting Remotes in Host Shell

The Host shell can mount any remote (React or non-React) using `<UniversalRemoteMount />` from `@mfe/shared/adapters`:

```jsx
import { UniversalRemoteMount } from "@mfe/shared/adapters";
import { RemoteErrorBoundary } from "./components/RemoteErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";

// In your Host routing:
<Route
  path="/vue-app/*"
  element={
    <RemoteErrorBoundary remoteName="Vue Sub-App">
      <UniversalRemoteMount
        loadRemote={() => import("vueService/mount")}
        props={{ userId: currentUser.id }}
        fallback={<LoadingFallback message="Loading Vue Micro-App..." />}
      />
    </RemoteErrorBoundary>
  }
/>
```

---

## 4. Cross-MFE Communication Across Frameworks

The event bus in `@mfe/shared/events` uses pure native DOM `CustomEvent` dispatching:

* **Dispatching from any framework**:
  ```javascript
  import { sendMfeEvent, MFE_EVENTS } from "@mfe/shared/events";

  sendMfeEvent(MFE_EVENTS.NOTIFICATION, {
    message: "Action completed in Vue/Svelte remote",
  });
  ```

* **Listening in non-React frameworks (Vanilla, Vue, Svelte)**:
  ```javascript
  import { listenMfeEvent, MFE_EVENTS } from "@mfe/shared/events";

  // Returns an unsubscribe function:
  const unsubscribe = listenMfeEvent(MFE_EVENTS.PING, (detail) => {
    console.log("Ping received:", detail);
  });

  // Call on component unmount:
  unsubscribe();
  ```

* **Listening in React**:
  ```javascript
  import { useMfeEventListener, MFE_EVENTS } from "@mfe/shared/adapters";

  useMfeEventListener(MFE_EVENTS.PING, (detail) => {
    console.log("Ping received:", detail);
  });
  ```

---

## 5. CSS Isolation & Styling Strategies

When co-locating multiple frameworks (Vue, Svelte, React) in one document:
- The default setup utilizes shared Tailwind CSS tokens.
- For complete style encapsulation (e.g. mounting inside a Shadow Root or scoped class namespaces), see the detailed [CSS Isolation Guide](./CSS_ISOLATION.md).


# In-Depth Getting Started Guide: `@subrataroy100/mfe-shared`

A comprehensive, step-by-step tutorial on building production-ready Micro-Frontends (MFE) using **Vite**, **Module Federation**, and the **`@subrataroy100/mfe-shared`** library.

---

## 📑 Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [Installation](#2-installation)
3. [Step 1: Building a Remote Micro-Frontend](#3-step-1-building-a-remote-micro-frontend)
4. [Step 2: Building the Host Container (Shell)](#4-step-2-building-the-host-container-shell)
5. [Step 3: Cross-MFE Communication (Scoped Event Bus)](#5-step-3-cross-mfe-communication-scoped-event-bus)
6. [Step 4: Non-React Remotes (Vue, Svelte, Vanilla)](#6-step-4-non-react-remotes-vue-svelte-vanilla)
7. [Step 5: CSS Isolation (Shadow DOM & Class Namespaces)](#7-step-5-css-isolation-shadow-dom--class-namespaces)
8. [Step 6: End-to-End TypeScript Type Safety](#8-step-6-end-to-end-typescript-type-safety)
9. [Step 7: Production Build & Deployment](#9-step-7-production-build--deployment)
10. [Troubleshooting & Common Pitfalls](#10-troubleshooting--common-pitfalls)

---

## 1. Overview & Architecture

### What is `@subrataroy100/mfe-shared`?
When teams implement Micro-Frontends with Vite and Module Federation, they encounter five recurring, difficult problems:
1. **Missing Remote CSS**: Dynamically imported remote modules often fail to inject their stylesheet chunks into the document head.
2. **React Singleton Duplication**: If both the host and remotes bundle their own copies of React or ReactDOM, React throws `Invalid hook call` errors and crashes.
3. **Window Event Collisions**: When multiple independent remotes listen to generic event names on `window`, they collide and lack sender identity.
4. **Multi-Framework Incompatibility**: Mounting a Vue 3, Svelte 5, or Vanilla JS remote inside a React host requires custom lifecycle glue.
5. **CSS Bleeding**: Unqualified CSS rules in a remote can inadvertently override the host's styling or that of sibling remotes.

**`@subrataroy100/mfe-shared` is designed to solve all five problems** with a battle-tested, zero-boilerplate API.

```
┌─────────────────────────────────────────────────────────────┐
│                       BROWSER WINDOW                        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │               HOST CONTAINER (:5000)                │   │
│   │  Header, Global Nav, Authentication, Layout Shell   │   │
│   │                                                     │   │
│   │   ┌──────────────────────────────────────────────┐  │   │
│   │   │    <UniversalRemoteMount shadowDom={...}>   │  │   │
│   │   │   ┌──────────────────────────────────────┐   │  │   │
│   │   │   │     REMOTE MICRO-FRONTEND (:5001)    │   │  │   │
│   │   │   │   Cart / Checkout / Dashboard App    │   │  │   │
│   │   │   └──────────────────────────────────────┘   │  │   │
│   │   └──────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────┘   │
│                              ▲                              │
│                              │                              │
│    Scoped Event Bus: 'team-commerce:cart:updated'           │
│    (CustomEvent with sender, namespace, & payload)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Installation

> [!IMPORTANT]
> The package is published under the scoped namespace `@subrataroy100/`. Always specify the scope during installation.

In both your **Host** application and every **Remote** application, install the package:

```bash
# Using npm
npm install @subrataroy100/mfe-shared

# Using pnpm
pnpm add @subrataroy100/mfe-shared

# Using yarn
yarn add @subrataroy100/mfe-shared
```

---

## 3. Step 1: Building a Remote Micro-Frontend

Let's build a standalone **Cart Remote** that will expose its main application to any host container.

### 1. Initialize the Remote App
```bash
npm create vite@latest cart-remote -- --template react
cd cart-remote
npm install
npm install @subrataroy100/mfe-shared
npm install -D @module-federation/vite
```

### 2. Configure `vite.config.js`
Use the high-level preset `defineRemoteConfig` from `@subrataroy100/mfe-shared/vite`. This preset automatically handles:
- Exposing your modules for Module Federation.
- Guaranteeing React and ReactDOM singletons.
- Injecting the **automatic CSS link injector** (`federationCssFixPlugin`).

```javascript
// cart-remote/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { defineRemoteConfig } from '@subrataroy100/mfe-shared/vite';

export default defineConfig(
  defineRemoteConfig({
    name: 'cartRemote',
    port: 5001,
    framework: 'react',
    exposes: {
      // Expose the root component / app
      './App': './src/App.jsx',
      // Optionally expose smaller widgets
      './CartBadge': './src/components/CartBadge.jsx',
    },
    plugins: [react()],
  })
);
```

### 3. Expose Dual-Mode Components (`src/App.jsx`)
Using `createReactMount` from `@subrataroy100/mfe-shared/adapters`, your component becomes **dual-mode**:
1. It can be rendered directly in React JSX: `<CartApp />`
2. It can be mounted into raw DOM elements imperatively: `CartApp.mount(container, props)`

```jsx
// cart-remote/src/App.jsx
import React, { useState } from 'react';
import { createReactMount } from '@subrataroy100/mfe-shared/adapters';
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events';

// Create a scoped event bus for this remote
const cartBus = createMfeEventBus({
  sender: 'cart-remote',
  namespace: 'team-commerce',
});

function CartApp({ initialItems = 0, onCheckout }) {
  const [items, setItems] = useState(initialItems);

  const addItem = () => {
    const nextCount = items + 1;
    setItems(nextCount);
    // Broadcast namespaced event to host or sibling remotes
    cartBus.send('cart:updated', { count: nextCount });
  };

  return (
    <div style={{ padding: '1.5rem', border: '2px solid #3b82f6', borderRadius: '12px' }}>
      <h2>🛒 Shopping Cart Remote (Port 5001)</h2>
      <p>Items in cart: <strong>{items}</strong></p>
      <button onClick={addItem} style={{ marginRight: '0.5rem' }}>Add Item</button>
      {onCheckout && <button onClick={onCheckout}>Checkout</button>}
    </div>
  );
}

// Wrap with createReactMount for dual-mode consumption
export default createReactMount(CartApp);
```

### 4. Build and Preview the Remote
In Vite Module Federation, remotes must be built to generate `remoteEntry.js`:
```bash
npm run build
npm run preview -- --port 5001 --strictPort
```
Your remote manifest is now live at: `http://localhost:5001/assets/remoteEntry.js`.

---

## 4. Step 2: Building the Host Container (Shell)

Now, let's create the **Host Container** that will load and orchestrate the Cart Remote at runtime.

### 1. Initialize the Host App
```bash
npm create vite@latest host-app -- --template react
cd host-app
npm install
npm install @subrataroy100/mfe-shared
npm install -D @module-federation/vite
```

### 2. Configure `vite.config.js` in Host
Configure the federation plugin using `DEFAULT_SHARED_DEPS`:

```javascript
// host-app/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as mf from '@module-federation/vite';
import { DEFAULT_SHARED_DEPS } from '@subrataroy100/mfe-shared/vite';

export default defineConfig({
  plugins: [
    react(),
    mf.federation({
      name: 'hostApp',
      remotes: {
        cartRemote: {
          type: 'module',
          name: 'cartRemote',
          entry: 'http://localhost:5001/remoteEntry.js',
          entryGlobalName: 'cartRemote',
          shareScope: 'default',
        },
      },
      // Ensures Host and Remotes share identical React 19 singletons:
      shared: DEFAULT_SHARED_DEPS,
    }),
  ],
  server: {
    port: 5000,
  },
});
```

### 3. Mount the Remote in Host (`src/App.jsx`)
Use `<UniversalRemoteMount>` from `@subrataroy100/mfe-shared/adapters`:

```jsx
// host-app/src/App.jsx
import React, { useState } from 'react';
import { UniversalRemoteMount } from '@subrataroy100/mfe-shared/adapters';
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events';

// Create a listener bus in the host
const commerceBus = createMfeEventBus({
  sender: 'host-shell',
  namespace: 'team-commerce',
});

export default function HostApp() {
  const [cartCount, setCartCount] = useState(0);

  // Listen to events emitted by the cart remote (receives event detail directly)
  commerceBus.useListener('cart:updated', (detail) => {
    console.log('Received cart update from:', detail.sender);
    setCartCount(detail.count);
  });

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '2rem auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
        <h1>🏠 Enterprise Host Shell (:5000)</h1>
        <div style={{ fontSize: '1.25rem' }}>Cart Badge: <strong>{cartCount}</strong></div>
      </header>

      <main style={{ marginTop: '2rem' }}>
        {/* Mount the remote with error handling, fallback skeleton, and optional shadow DOM */}
        <UniversalRemoteMount
          module={() => import('cartRemote/App')}
          props={{
            initialItems: 2,
            onCheckout: () => alert(`Host received checkout for ${cartCount} items!`),
          }}
          fallback={<div style={{ padding: '1rem', background: '#f3f4f6' }}>Loading Cart Remote...</div>}
          errorFallback={(err) => (
            <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c' }}>
              ⚠️ Failed to load Cart Remote: {err.message}
            </div>
          )}
        />
      </main>
    </div>
  );
}
```

### 4. Run the Host
```bash
npm run dev -- --port 5000
```
Open **`http://localhost:5000`**. You will see the Host Shell rendering the Cart Remote seamlessly!

---

## 5. Step 3: Cross-MFE Communication (Scoped Event Bus)

Micro-frontends should **never share global Redux or Zustand stores**. That introduces tight version coupling and memory leaks. Instead, use `@subrataroy100/mfe-shared/events`.

### Why Scoped?
If two teams dispatch `item:added` on the global `window`, they clash. `createMfeEventBus` scopes events using a namespace:

```typescript
const bus = createMfeEventBus({
  sender: 'checkout-remote',
  namespace: 'team-payments'
});
```

### Sending Events
```javascript
// Dispatches browser CustomEvent named 'team-payments:order:placed'
bus.send('order:placed', { orderId: 'ord-9921', total: 159.00 });
```

The dispatched event payload on `window` includes full telemetry stamped onto `detail`:
```json
{
  "orderId": "ord-9921",
  "total": 159.00,
  "sender": "checkout-remote",
  "namespace": "team-payments",
  "timestamp": 1726543200000
}
```

### Receiving Events in React
Use `bus.useListener(eventName, handler)`:
```jsx
bus.useListener('order:placed', (detail) => {
  console.log('Order placed by:', detail.sender);
  console.log('Order total:', detail.total);
});
// When component unmounts, the event listener is removed automatically!
```

### Zero-Dependency Core for Non-React Remotes
If a remote is written in Vue, Svelte, or Vanilla JS and doesn't want React dependencies, import from `/events/core`:
```javascript
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events/core';

const bus = createMfeEventBus({ sender: 'vanilla-widget', namespace: 'team-analytics' });
const unsubscribe = bus.listen('analytics:click', (detail) => {
  console.log('Clicked:', detail);
});

// Call when destroying the widget
unsubscribe();
```

---

## 6. Step 4: Non-React Remotes (Vue, Svelte, Vanilla)

You can easily mount non-React remotes into the React Host using `createVanillaMount`.

### Vanilla JS Remote
```javascript
// vanilla-remote/src/mount.js
import { createVanillaMount } from '@subrataroy100/mfe-shared/adapters';

export default createVanillaMount((container, props) => {
  container.innerHTML = `
    <div style="padding: 1rem; background: #1e293b; color: white; border-radius: 8px;">
      <h3>⚡ Pure Vanilla Remote</h3>
      <p>Hello, ${props.username || 'Guest'}!</p>
    </div>
  `;

  // Return unmount cleanup function
  return () => {
    container.innerHTML = '';
  };
});
```

### Vue 3 Remote
```javascript
// vue-remote/src/mount.js
import { createApp } from 'vue';
import App from './App.vue';

export function mount(container, props = {}) {
  const app = createApp(App, props);
  app.mount(container);
  return () => app.unmount();
}
```

### Mounting into Host
`<UniversalRemoteMount />` automatically detects `{ mount }` and renders it cleanly:
```jsx
<UniversalRemoteMount
  module={() => import('vueRemote/mount')}
  props={{ username: 'Alice' }}
/>
```

---

## 7. Step 5: CSS Isolation (Shadow DOM & Class Namespaces)

If a remote contains third-party CSS or a CSS reset (like `* { box-sizing: border-box; margin: 0; }`) that conflicts with the host shell, opt-in to **Shadow DOM encapsulation**:

```jsx
<UniversalRemoteMount
  module={() => import('cartRemote/App')}
  props={{ theme: 'dark' }}
  shadowDom={{ mode: 'open' }} // Creates an isolated ShadowRoot
/>
```

Styles inside the ShadowRoot will **never leak out**, and external styles will **not bleed in**.

---

## 8. Step 6: End-to-End TypeScript Type Safety

Define strongly typed event contracts across applications using TypeScript module augmentation:

```typescript
// src/types/mfe-events.d.ts
import '@subrataroy100/mfe-shared';

declare module '@subrataroy100/mfe-shared' {
  interface MfeEventRegistry {
    'team-commerce:cart:updated': { count: number };
    'team-payments:order:placed': { orderId: string; total: number };
  }
}
```

Now, `bus.send()` and `bus.useListener()` will provide full IntelliSense autocompletion and compile-time type checking.

---

## 9. Step 7: Production Build & Deployment

### Cache Control Configuration
In Micro-Frontends, `remoteEntry.js` is the entry point manifest that points to content-hashed chunks.

* **`remoteEntry.js`**: Must **never be cached** by browsers or CDNs.
  ```http
  Cache-Control: no-cache, no-store, must-revalidate
  ```
* **`/assets/*.js` and `/assets/*.css`**: Have unique content hashes (e.g. `style-CnuQjJ5x.css`) and can be **cached permanently**:
  ```http
  Cache-Control: public, max-age=31536000, immutable
  ```

### Dynamic Remote URLs in Production
Instead of hardcoding `http://localhost:5001/assets/remoteEntry.js`, you can resolve remotes dynamically in production:

```html
<!-- In index.html of Host -->
<script>
  window.__MFE_RUNTIME_CONFIG__ = {
    cartRemote: "https://cart-cdn.mycompany.com/assets/remoteEntry.js",
  };
</script>
```

---

## 10. Troubleshooting & Common Pitfalls

### 1. `Error: Invalid hook call. Hooks can only be called inside the body of a function component.`
* **Cause**: Multiple instances of React or ReactDOM are bundled in the browser.
* **Fix**: Ensure `DEFAULT_SHARED_DEPS.react` is passed to the federation plugin in both Host and Remote `vite.config.js`.

### 2. Remote styles are missing when dynamically navigating
* **Cause**: Vite Module Federation does not inject CSS `<link>` tags into the DOM automatically.
* **Fix**: Use `defineRemoteConfig` in your remote's `vite.config.js`. It automatically injects `federationCssFixPlugin`, which hooks into `remoteEntry.js` and appends all remote CSS chunks to `document.head`.

### 3. Events trigger duplicate handlers
* **Cause**: Missing event listener cleanup when components unmount.
* **Fix**: Always use `bus.useListener(...)` inside React components or call the `unsubscribe()` function returned by `bus.listen(...)`.

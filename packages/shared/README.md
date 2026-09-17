# @subrataroy100/mfe-shared

Cross-micro-frontend event bus, Universal Adapters for multi-framework federation, Shadow DOM CSS isolation, shared UI primitives, configuration constants, and centralized Vite federation preset.

Designed for production Micro-Frontend architectures powered by **Vite**, **Module Federation**, and any frontend framework.

[![npm version](https://img.shields.io/npm/v/@subrataroy100/mfe-shared.svg)](https://www.npmjs.com/package/@subrataroy100/mfe-shared)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

> 📖 **Full Step-by-Step Tutorial**: For an end-to-end walkthrough on building a Host and Remote from scratch, see the **[In-Depth Getting Started Guide](../../docs/NPM_GETTING_STARTED.md)**.

## 📦 Installation

```bash
# npm
npm install @subrataroy100/mfe-shared

# pnpm
pnpm add @subrataroy100/mfe-shared

# yarn
yarn add @subrataroy100/mfe-shared
```

Within a monorepo workspace (pnpm):
```json
{
  "dependencies": {
    "@subrataroy100/mfe-shared": "workspace:*"
  }
}
```

---

## 🚀 Subpath Exports

| Subpath | What It Exports | Use Case |
| :--- | :--- | :--- |
| `@subrataroy100/mfe-shared` | Everything (events + adapters + constants + Button) | Barrel import for all features |
| `@subrataroy100/mfe-shared/events` | `createMfeEventBus`, `useMfeEventListener`, `sendMfeEvent`, `listenMfeEvent`, `MFE_EVENTS` + React `useListener` | Scoped & global event bus with React hooks |
| `@subrataroy100/mfe-shared/events/core` | Same as `/events` but **zero React dependency** | Vue, Svelte, Solid, Vanilla JS remotes |
| `@subrataroy100/mfe-shared/adapters` | `UniversalRemoteMount`, `normalizeRemoteModule`, `createReactMount`, `createVanillaMount`, `useMfeEventListener` | Mounting any remote in the host |
| `@subrataroy100/mfe-shared/vite` | `defineRemoteConfig`, `mergeSharedDeps`, `FRAMEWORK_SHARED_DEPS`, `DEFAULT_SHARED_DEPS`, `federationCssFixPlugin` | Remote vite.config preset + CSS fix |
| `@subrataroy100/mfe-shared/components/Button` | `Button` | Pre-styled shared UI button |
| `@subrataroy100/mfe-shared/constants` | `MFE_CONFIG` | Dev ports & default URLs |

---

## 🛠️ API Reference

### 1. Vite Federation Preset (`/vite`)

#### `defineRemoteConfig(options)`

Drop-in preset for a remote's `vite.config.js`. Handles framework plugins, singleton sharing, CSS auto-injection, port lookup from `remotes.manifest.json`, and CORS headers.

```javascript
// vite.config.js (in your remote)
import { defineRemoteConfig } from '@subrataroy100/mfe-shared/vite';

export default defineRemoteConfig({
  name: 'cartRemote',         // Required. Unique remote name.
  framework: 'react',         // 'react'|'vue'|'svelte'|'solid'|'vanilla'|'none'. Default: 'react'
  port: 5001,                 // Optional. Auto-inferred from remotes.manifest.json if omitted.
  tailwind: true,             // Auto-includes @tailwindcss/vite. Default: true
  exposes: {
    './App': './src/App.jsx',
    './Widget': './src/Widget.jsx',
  },
  shared: {
    // Merged on top of framework defaults. React singletons always preserved.
    zustand: { singleton: true },
  },
  // frameworkPlugin: vue(),           // Custom framework plugin for non-React
  // reactOptions: {},                 // Passed to @vitejs/plugin-react
  // federationOptions: {},            // Extra @originjs/vite-plugin-federation options
  // plugins: [],                      // Additional Vite plugins
  // cors: true,                       // CORS on preview server. Default: true ('*')
  // extend: (config, env) => config,  // Escape-hatch to mutate final Vite config
});
```

**Framework shared dependency baselines** (automatically applied):

| `framework` | Auto-added singletons |
| :--- | :--- |
| `react` | `react@^19`, `react-dom@^19`, `react-router@^8` |
| `vue` | `vue` |
| `solid` | `solid-js` |
| `svelte` | _(none)_ |
| `vanilla` / `none` | _(none)_ |

#### `mergeSharedDeps(framework?, userShared?)`

Merges baseline framework shared deps with custom overrides:
```javascript
import { mergeSharedDeps } from '@subrataroy100/mfe-shared/vite';
const shared = mergeSharedDeps('react', { zustand: { singleton: true } });
// => { react: {...}, 'react-dom': {...}, 'react-router': {...}, zustand: { singleton: true } }
```

#### `federationCssFixPlugin`

A Vite plugin that:
1. Fixes the `__v__css__` placeholder bug in `@originjs/vite-plugin-federation`
2. Auto-injects remote CSS `<link>` tags into `document.head` when the remote entry loads

> Already included automatically by `defineRemoteConfig`. Only add manually if you are not using the preset.

```javascript
import { federationCssFixPlugin } from '@subrataroy100/mfe-shared/vite';
// plugins: [federation({...}), federationCssFixPlugin]
```

---

### 2. Event Bus (`/events` and `/events/core`)

Cross-MFE messaging via native browser `CustomEvent`. Events carry `sender`, `namespace`, and `timestamp` metadata automatically.

#### `createMfeEventBus(options?)`

Creates a **scoped** event bus bound to a sender and optional namespace. Prevents event name collisions across multiple remotes.

```typescript
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events';

const cartBus = createMfeEventBus({
  sender: 'cart-remote',      // Identifies the emitting service
  namespace: 'team-checkout', // Optional prefix for all event names
});

// Send (resolves as 'team-checkout:item:added')
cartBus.send('item:added', { id: 'p1', name: 'Laptop', price: 1200 });

// React hook — auto-subscribes & cleans up on unmount
function CartWidget() {
  cartBus.useListener('item:added', (detail) => {
    console.log(detail.sender);    // 'cart-remote'
    console.log(detail.namespace); // 'team-checkout'
  });
  return <div>Cart</div>;
}

// Imperative subscribe (any framework)
const unsubscribe = cartBus.listen('item:added', (detail) => console.log(detail));
unsubscribe(); // cleanup when done
```

**Scoped bus API:**

| Method | Signature | Description |
| :--- | :--- | :--- |
| `send` | `(eventName, payload?) => void` | Dispatch event with namespace prefix |
| `listen` | `(eventName, handler) => () => void` | Subscribe. Returns unsubscribe function |
| `useListener` | `(eventName, handler) => void` | React hook subscription (auto-cleanup on unmount) |
| `resolveEventName` | `(eventName) => string` | Returns namespaced event name |
| `sender` | `string` | Sender identifier |
| `namespace` | `string \| null` | Namespace prefix |

> **`/events/core`** exports the same bus API **without React** — `useListener` is not available. Use this in Vue, Svelte, Solid, or Vanilla JS remotes.

#### Global (unscoped) helpers

```typescript
import { sendMfeEvent, listenMfeEvent, MFE_EVENTS } from '@subrataroy100/mfe-shared/events';

sendMfeEvent(MFE_EVENTS.PING, { count: 1 });
const unsubscribe = listenMfeEvent(MFE_EVENTS.PONG, (detail) => console.log(detail));
```

**`MFE_EVENTS` constants:**

| Key | Value |
| :--- | :--- |
| `PING` | `'mfe:ping'` |
| `PONG` | `'mfe:pong'` |
| `NOTIFICATION` | `'mfe:notification'` |
| `NAVIGATION` | `'mfe:navigation'` |
| `CART_UPDATE` | `'mfe:cart_update'` |
| `ORDER_PLACED` | `'mfe:order_placed'` |

#### `useMfeEventListener(eventName, handler)`

Global React hook (no namespace prefix, stable against re-renders):
```typescript
import { useMfeEventListener } from '@subrataroy100/mfe-shared/events';

function Component() {
  useMfeEventListener('mfe:ping', (detail) => console.log(detail));
}
```

#### TypeScript Module Augmentation

```typescript
// mfe-events.d.ts
declare module '@subrataroy100/mfe-shared' {
  interface MfeEventRegistry {
    'checkout:order:placed': { orderId: string; total: number; itemCount: number };
    'auth:user:logged-in': { userId: string; role: string };
  }
}
```

---

### 3. Universal Remote Mount & Adapters (`/adapters`)

#### `<UniversalRemoteMount>` — Host-side component

Mounts any federated remote micro-frontend — React components, lifecycle contracts `{ mount, unmount }`, Vue, Svelte, Solid, or Vanilla JS.

```tsx
import { UniversalRemoteMount } from '@subrataroy100/mfe-shared/adapters';

<UniversalRemoteMount
  module={() => import('cartRemote/App')}    // Async loader (or direct component)
  props={{ theme: 'dark', userId: 'u42' }}  // Passed to the remote
  fallback={<div>Loading Cart...</div>}      // Shown while loading
  errorFallback={(error, retry) => (         // Custom error UI with retry
    <div>
      Error: {error.message}
      <button onClick={retry}>Retry</button>
    </div>
  )}
  shadowDom={{ mode: 'open' }}               // CSS isolation via Shadow DOM
  remoteName="Cart Remote"                   // Used in logs and error messages
  remoteKey="cart"                           // Changing triggers full reload
  retryKey={retryCount}                      // Increment to trigger retry from parent
  onError={(err) => reportError(err)}        // Error callback
/>
```

**All Props:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `module` | `any` | — | Async loader fn, direct React component, or direct object. Takes priority over `loadRemote` |
| `loadRemote` | `() => Promise<any>` | — | Legacy alias for `module` |
| `props` | `Record<string, any>` | `{}` | Props forwarded to the remote |
| `fallback` | `ReactNode` | Grey loading div | Shown while remote is loading |
| `errorFallback` | `ReactNode \| (err, retry) => ReactNode` | Red error card with retry button | Custom error UI |
| `className` | `string` | `'universal-remote-container'` | CSS class on container div |
| `remoteName` | `string` | `'Remote Micro-Frontend'` | Debug/log identifier |
| `remoteKey` | `string` | — | Stable ID; changing forces full unmount & reload |
| `retryKey` | `number \| string` | `0` | Increment to retry loading |
| `shadowDom` | `boolean \| ShadowRootInit` | `false` | `true` = open Shadow DOM; `{mode:'closed'}` for closed |
| `onError` | `(error: Error) => void` | — | Called when load or mount fails |

**`module` prop behavior:**

| Value | Behavior |
| :--- | :--- |
| `() => import('remote/App')` | Called; awaits Promise; normalizes result |
| `MyReactComponent` (function) | Used directly without calling |
| `{ mount, unmount }` object | Used directly as lifecycle contract |
| `loadRemote={() => ...}` | Same as `module` (legacy prop) |

#### `normalizeRemoteModule(mod)`

Normalizes any remote module shape into `{ mount, unmount?, update?, Component?, raw }`:
1. `{ mount, unmount? }` — lifecycle contract → used as-is
2. `{ default: { mount } }` — default-exported lifecycle → unwrapped
3. React component (function or `$$typeof`) → wrapped with `createReactMount`

#### `createReactMount(Component)`

Creates a **dual-mode** mount — usable in JSX and imperatively:

```jsx
import { createReactMount } from '@subrataroy100/mfe-shared/adapters';

function MyFeature({ title }) {
  return <h2>{title}</h2>;
}

export default createReactMount(MyFeature);
// JSX:          <MyFeature title="Hello" />
// Imperative:   const inst = MyFeature.mount(domNode, { title: 'Hello' })
//               inst.update({ title: 'World' })  // re-renders without unmount
//               inst.unmount()                   // React 19 safe microtask teardown
```

#### `createVanillaMount(renderFn)`

Creates a lifecycle contract for Vanilla JS micro-frontends:

```javascript
import { createVanillaMount } from '@subrataroy100/mfe-shared/adapters';

export default createVanillaMount((container, props) => {
  container.innerHTML = `<div class="widget">Hello ${props.name}</div>`;
  // Return cleanup function:
  return () => {
    container.innerHTML = '';
  };
});
// Exported shape: { mount(container, props) => { update(props), unmount() }, renderFn }
```

---

### 4. Shared UI Primitives (`/components/Button`)

```jsx
import Button from '@subrataroy100/mfe-shared/components/Button';

<Button variant="primary" onClick={() => {}}>Primary</Button>
<Button variant="secondary" size="sm">Secondary</Button>
<Button variant="danger" size="lg">Delete</Button>
```

---

### 5. Constants (`/constants`)

```typescript
import { MFE_CONFIG } from '@subrataroy100/mfe-shared/constants';

MFE_CONFIG.HOST.NAME          // 'host'
MFE_CONFIG.HOST.PORT          // 5000
MFE_CONFIG.HOST.DEFAULT_URL   // 'http://localhost:5000'
MFE_CONFIG.DEMO_SERVICE.PORT  // 5001
MFE_CONFIG.DEMO_SERVICE.ENTRY_PATH  // '/remoteEntry.js'
```

---

## 📘 Complete Quick-Start

### Remote `vite.config.js`:
```javascript
import { defineRemoteConfig } from '@subrataroy100/mfe-shared/vite';

export default defineRemoteConfig({
  name: 'cartRemote',
  port: 5001,
  exposes: { './App': './src/App.jsx' },
});
```

### Remote `src/App.jsx`:
```jsx
import { createReactMount } from '@subrataroy100/mfe-shared/adapters';
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events';

const bus = createMfeEventBus({ sender: 'cart-remote', namespace: 'commerce' });

function CartApp({ theme }) {
  bus.useListener('product:selected', (detail) => {
    bus.send('cart:updated', { count: 1 });
  });
  return <div className={`cart ${theme}`}>Cart</div>;
}

export default createReactMount(CartApp);
```

### Host `src/App.jsx`:
```jsx
import { UniversalRemoteMount } from '@subrataroy100/mfe-shared/adapters';

export function HostView() {
  return (
    <UniversalRemoteMount
      module={() => import('cartRemote/App')}
      props={{ theme: 'dark' }}
      shadowDom={{ mode: 'open' }}
      fallback={<div>Loading cart...</div>}
      errorFallback={(err, retry) => (
        <div>Failed: {err.message} <button onClick={retry}>Retry</button></div>
      )}
    />
  );
}
```

---

## 📄 License

[MIT](LICENSE) © Subrata Roy

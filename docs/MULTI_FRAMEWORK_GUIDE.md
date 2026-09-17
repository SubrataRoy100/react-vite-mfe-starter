# Multi-Framework MFE Guide

This guide explains how to build and consume micro-frontend remotes written in **Vue 3, Svelte 5, SolidJS, or plain Vanilla JS** — all consumed by a React host using the `@subrataroy100/mfe-shared` toolkit.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Framework Shared Dependencies](#2-framework-shared-dependencies)
3. [Vue 3 Remote](#3-vue-3-remote)
4. [Svelte 5 Remote](#4-svelte-5-remote)
5. [SolidJS Remote](#5-solidjs-remote)
6. [Vanilla JS Remote](#6-vanilla-js-remote)
7. [Host Setup — Consuming Any Remote](#7-host-setup--consuming-any-remote)
8. [Events Across Frameworks](#8-events-across-frameworks)
9. [Practical Tips](#9-practical-tips)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Host App                            │
│                                                                  │
│  <UniversalRemoteMount module={() => import('vueRemote/App')} /> │
│  <UniversalRemoteMount module={() => import('svelteRemote/App')} />│
│  <UniversalRemoteMount module={() => import('solidRemote/App')} />│
└───────────────────┬──────────────────────────────────────────────┘
                    │  Module Federation (Vite)
        ┌───────────┼───────────┬────────────┐
        ▼           ▼           ▼            ▼
   Vue Remote  Svelte Remote  Solid Remote  Vanilla Remote
```

Any framework can serve as a Module Federation remote as long as its exposed module satisfies the **Universal Lifecycle Contract** (see below). The React host uses `UniversalRemoteMount`, which automatically detects whether a module is a React component or a lifecycle-contract-based module and handles mounting/unmounting accordingly.

### Universal Lifecycle Contract

Every non-React remote **must** export an object (or have a `default` export) with the following shape:

```typescript
interface MfeLifecycleInstance {
  update?: (props: Record<string, any>) => void;
  unmount: () => void;
}

interface MfeModule {
  mount(
    container: HTMLElement | ShadowRoot,
    props?: Record<string, any>
  ): MfeLifecycleInstance | (() => void) | void;

  unmount?(container?: HTMLElement | ShadowRoot): void;
}
```

- **`mount(container, props)`** — called when the remote should render into `container`. May return:
  - An `MfeLifecycleInstance` `{ update?, unmount }` for fine-grained control.
  - A plain cleanup function `() => void`.
  - Nothing (`void`).
- **`unmount(container?)`** — optional top-level unmount hook (called in addition to any value returned by `mount`).

### `normalizeRemoteModule` Detection Order

When `UniversalRemoteMount` receives an imported module it passes it through `normalizeRemoteModule`, which resolves in this order:

1. **Direct or default-exported `.mount` function** → treats as lifecycle-contract module.
2. **React component** (plain function, or object with `$$typeof` / `.render`) → wraps with `createReactMount`.
3. **Unrecognized** → returns `null` (renders nothing / error).

---

## 2. Framework Shared Dependencies

`defineRemoteConfig` automatically injects shared singletons based on the `framework` option. The built-in `FRAMEWORK_SHARED_DEPS` map is:

| `framework` | Automatically shared |
|---|---|
| `react` | `react ^19.0.0` (singleton), `react-dom ^19.0.0` (singleton), `react-router ^8.0.0` (singleton) |
| `vue` | `vue` (singleton) |
| `solid` | `solid-js` (singleton) |
| `svelte` | *(none by default)* |
| `vanilla` | *(none by default)* |
| `none` | *(none by default)* |

You can always extend the auto-injected deps via the `shared` option in `defineRemoteConfig`.

**Supported framework values:** `'react' | 'vue' | 'svelte' | 'solid' | 'vanilla' | 'none'`

---

## 3. Vue 3 Remote

### `vite.config.ts`

```typescript
import { defineRemoteConfig } from '@subrataroy100/mfe-shared/vite';
import vue from '@vitejs/plugin-vue';

export default defineRemoteConfig({
  name: 'vueRemote',
  framework: 'vue',            // auto-shares vue as a singleton
  frameworkPlugin: vue(),      // pass your Vue plugin explicitly
  tailwind: false,             // disable Tailwind if not used
  exposes: {
    './App': './src/App.vue',
  },
  shared: {
    'vue-router': { singleton: true },   // add extra shared deps as needed
  },
});
```

> **`frameworkPlugin`** is optional. Pass it when you need the framework's Vite transform plugin (e.g., SFCs for Vue, JSX for Solid). Without it, `defineRemoteConfig` applies no additional Vite plugin beyond those already configured.

### `src/index.ts` — Lifecycle Contract Export

The exposed module must export a `mount` function. The cleanest pattern wraps the Vue app lifecycle:

```typescript
// src/index.ts  ← what you expose as './App'
import { createApp, h } from 'vue';
import App from './App.vue';

export const mount = (
  container: HTMLElement | ShadowRoot,
  props: Record<string, any> = {}
) => {
  const app = createApp({
    render: () => h(App, props),
  });

  app.mount(container as HTMLElement);

  return {
    update(newProps: Record<string, any>) {
      // Vue reactivity handles prop updates automatically
      // if App uses inject/provide or a store; otherwise re-mount.
      Object.assign(props, newProps);
    },
    unmount() {
      app.unmount();
    },
  };
};

export default { mount };
```

### Events — `events/core`

Use `@subrataroy100/mfe-shared/events/core` from any non-React remote. It has **zero React dependency**.

```typescript
import {
  createMfeEventBus,
  sendMfeEvent,
  listenMfeEvent,
  MFE_EVENTS,
} from '@subrataroy100/mfe-shared/events/core';

// createMfeEventBus returns a ScopedCoreEventBus:
// { sender, namespace, resolveEventName, send, listen }
const bus = createMfeEventBus({
  sender: 'vue-remote',
  namespace: 'team-search',
});

// Send an event
bus.send('search:query', { term: 'hello' });

// Listen to events from other remotes
const unsub = bus.listen('cart:updated', (detail) => {
  console.log('Cart updated:', detail);
});

// Always clean up in unmount
unsub();
```

> **Note:** `useListener` is a React hook and lives only in `@subrataroy100/mfe-shared/events`. Do **not** import it in Vue/Svelte/Solid/Vanilla remotes.

### Full Vue Remote Example

```typescript
// src/index.ts
import { createApp, h } from 'vue';
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events/core';
import App from './App.vue';

export const mount = (container: HTMLElement, props: Record<string, any> = {}) => {
  const bus = createMfeEventBus({ sender: 'vue-remote', namespace: 'search' });

  const app = createApp({ render: () => h(App, { ...props, bus }) });
  app.mount(container);

  const unsub = bus.listen('host:theme-changed', ({ theme }) => {
    // react to host theme changes
  });

  return {
    unmount() {
      unsub();
      app.unmount();
    },
  };
};

export default { mount };
```

---

## 4. Svelte 5 Remote

### `vite.config.ts`

```typescript
import { defineRemoteConfig } from '@subrataroy100/mfe-shared/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineRemoteConfig({
  name: 'svelteRemote',
  framework: 'svelte',         // no shared deps added automatically
  frameworkPlugin: svelte(),   // required for .svelte file transforms
  tailwind: false,
  exposes: {
    './App': './src/index.ts',
  },
});
```

> `svelte` has no auto-shared deps. If you share Svelte's internal stores across remotes, add them manually via the `shared` option.

### `src/index.ts`

```typescript
import { mount as svelteMount, unmount as svelteUnmount } from 'svelte';
import App from './App.svelte';

export const mount = (container: HTMLElement, props: Record<string, any> = {}) => {
  // Svelte 5 runes API
  const instance = svelteMount(App, { target: container, props });

  return {
    update(newProps: Record<string, any>) {
      // Svelte 5: re-mount with new props or use $state externally
      svelteUnmount(instance);
      Object.assign(props, newProps);
      svelteMount(App, { target: container, props });
    },
    unmount() {
      svelteUnmount(instance);
    },
  };
};

export default { mount };
```

### `src/App.svelte`

```svelte
<script lang="ts">
  import { createMfeEventBus } from '@subrataroy100/mfe-shared/events/core';

  let { name = 'World' } = $props();

  const bus = createMfeEventBus({ sender: 'svelte-remote', namespace: 'greet' });

  function handleClick() {
    bus.send('greet:clicked', { name });
  }
</script>

<button onclick={handleClick}>Hello, {name}!</button>
```

---

## 5. SolidJS Remote

### `vite.config.ts`

```typescript
import { defineRemoteConfig } from '@subrataroy100/mfe-shared/vite';
import solid from 'vite-plugin-solid';

export default defineRemoteConfig({
  name: 'solidRemote',
  framework: 'solid',          // auto-shares solid-js as a singleton
  frameworkPlugin: solid(),    // required for JSX transform
  tailwind: false,
  exposes: {
    './App': './src/index.tsx',
  },
});
```

### `src/index.tsx`

```tsx
import { render } from 'solid-js/web';
import App from './App';

export const mount = (container: HTMLElement, props: Record<string, any> = {}) => {
  const dispose = render(() => <App {...props} />, container);

  return {
    unmount() {
      dispose();
    },
  };
};

export default { mount };
```

### `src/App.tsx`

```tsx
import { createSignal, onCleanup } from 'solid-js';
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events/core';

interface Props {
  label?: string;
}

export default function App(props: Props) {
  const bus = createMfeEventBus({ sender: 'solid-remote', namespace: 'counter' });
  const [count, setCount] = createSignal(0);

  const unsub = bus.listen('host:reset', () => setCount(0));
  onCleanup(unsub);

  return (
    <div>
      <p>{props.label ?? 'Count'}: {count()}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}
```

---

## 6. Vanilla JS Remote

For simple widgets with no framework, use **`createVanillaMount`** from `@subrataroy100/mfe-shared/adapters`. It wraps your imperative DOM logic in the lifecycle contract automatically.

```typescript
import { createVanillaMount } from '@subrataroy100/mfe-shared/adapters';

export default createVanillaMount((container, props) => {
  // Build DOM imperatively
  const el = document.createElement('div');
  el.innerHTML = `<h3>Hello, ${props?.name ?? 'World'}</h3>`;
  container.appendChild(el);

  // Return a teardown cleanup function
  return () => {
    container.removeChild(el);
  };
});
```

`createVanillaMount` accepts your factory `(container, props) => cleanupFn` and returns an object `{ mount }` that satisfies the lifecycle contract. The cleanup function you return is called automatically on unmount.

### `vite.config.ts`

```typescript
import { defineRemoteConfig } from '@subrataroy100/mfe-shared/vite';

export default defineRemoteConfig({
  name: 'vanillaRemote',
  framework: 'vanilla',        // no shared deps added automatically
  tailwind: false,
  exposes: {
    './Widget': './src/widget.ts',
  },
});
```

### Full Vanilla Example with Events

```typescript
// src/widget.ts
import { createVanillaMount } from '@subrataroy100/mfe-shared/adapters';
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events/core';

export default createVanillaMount((container, props) => {
  const bus = createMfeEventBus({ sender: 'vanilla-remote', namespace: 'widget' });

  const root = document.createElement('section');
  root.innerHTML = `<p>Item count: <span id="count">0</span></p>`;
  container.appendChild(root);

  const countEl = root.querySelector('#count')!;

  const unsub = bus.listen('cart:updated', ({ count }) => {
    countEl.textContent = String(count);
  });

  // Cleanup: remove DOM and unsubscribe
  return () => {
    unsub();
    container.removeChild(root);
  };
});
```

---

## 7. Host Setup — Consuming Any Remote

The React host consumes **any** remote — regardless of framework — through `UniversalRemoteMount`.

### Federated Remotes in `vite.config.ts` (Host)

```typescript
import { defineHostConfig } from '@subrataroy100/mfe-shared/vite';

export default defineHostConfig({
  remotes: {
    vueRemote:     'http://localhost:3001/assets/remoteEntry.js',
    svelteRemote:  'http://localhost:3002/assets/remoteEntry.js',
    solidRemote:   'http://localhost:3003/assets/remoteEntry.js',
    vanillaRemote: 'http://localhost:3004/assets/remoteEntry.js',
  },
});
```

### `UniversalRemoteMount` Usage

```tsx
import { UniversalRemoteMount } from '@subrataroy100/mfe-shared/adapters';

function Dashboard() {
  return (
    <>
      {/* Vue remote */}
      <UniversalRemoteMount
        module={() => import('vueRemote/App')}
        props={{ theme: 'dark', userId: 42 }}
        shadowDom={{ mode: 'open' }}
        remoteName="Vue Remote"
        fallback={<div>Loading Vue remote…</div>}
        errorFallback={(err, retry) => (
          <div>
            Error: {err.message}
            <button onClick={retry}>Retry</button>
          </div>
        )}
      />

      {/* Svelte remote */}
      <UniversalRemoteMount
        module={() => import('svelteRemote/App')}
        props={{ name: 'Alice' }}
        shadowDom={{ mode: 'open' }}
        remoteName="Svelte Remote"
        fallback={<div>Loading Svelte remote…</div>}
      />

      {/* Solid remote */}
      <UniversalRemoteMount
        module={() => import('solidRemote/App')}
        props={{ label: 'Score' }}
        shadowDom={{ mode: 'open' }}
        remoteName="Solid Remote"
      />

      {/* Vanilla remote */}
      <UniversalRemoteMount
        module={() => import('vanillaRemote/Widget')}
        shadowDom={{ mode: 'open' }}
        remoteName="Vanilla Widget"
      />
    </>
  );
}
```

### `module` Prop Behavior

| Value passed to `module` | How it is handled |
|---|---|
| `() => import('remote/App')` (async function returning a Promise) | Called, awaited; result passed to `normalizeRemoteModule` |
| Direct React component function | Detected (no Promise returned), used directly as a React component |
| Plain object `{ mount, unmount? }` | Used directly as a lifecycle-contract module |
| `loadRemote` prop | **Legacy alias** — behaves identically to `module` |

---

## 8. Events Across Frameworks

| Import path | Who should use it | Includes |
|---|---|---|
| `@subrataroy100/mfe-shared/events/core` | **All frameworks** (Vue, Svelte, Solid, Vanilla, React) | `createMfeEventBus`, `sendMfeEvent`, `listenMfeEvent`, `MFE_EVENTS` |
| `@subrataroy100/mfe-shared/events` | **React only** | Everything from `/events/core` + React hooks (`useListener`, etc.) |

### `createMfeEventBus` — Scoped Event Bus

`createMfeEventBus` returns a `ScopedCoreEventBus`:

```typescript
interface ScopedCoreEventBus {
  sender: string;
  namespace: string;
  resolveEventName(event: string): string;
  send(event: string, detail?: any): void;
  listen(event: string, handler: (detail: any) => void): () => void; // returns unsub fn
}
```

```typescript
import { createMfeEventBus } from '@subrataroy100/mfe-shared/events/core';

const bus = createMfeEventBus({
  sender: 'vue-remote',
  namespace: 'team-search',
});

// Publish
bus.send('search:query', { term: 'hello' });

// Subscribe — always capture the unsubscribe fn and call it on cleanup
const unsub = bus.listen('cart:updated', (detail) => {
  console.log('Cart updated:', detail);
});

// On component/widget teardown:
unsub();
```

### React Host Listening to Non-React Events

```tsx
// React host — use the /events import for hooks
import { useListener } from '@subrataroy100/mfe-shared/events';

function CartBadge() {
  const [count, setCount] = React.useState(0);

  useListener('cart:updated', ({ count }) => setCount(count));

  return <span>{count}</span>;
}
```

### Global Low-Level API

```typescript
import {
  sendMfeEvent,
  listenMfeEvent,
  MFE_EVENTS,
} from '@subrataroy100/mfe-shared/events/core';

// Send without a bus instance
sendMfeEvent('cart:updated', { count: 5 });

// Listen without a bus instance
const unsub = listenMfeEvent('cart:updated', (detail) => console.log(detail));
unsub();
```

---

## 9. Practical Tips

### Singleton Pitfalls

- **Never load the same library twice.** If both host and remote bundle `vue` or `solid-js`, you'll get two separate instances, breaking reactivity, stores, and context.
- `defineRemoteConfig` with `framework: 'vue'` marks `vue` as a singleton automatically. For extra deps (e.g., `vue-router`, `pinia`), add them to `shared` manually.
- For Svelte and Vanilla, `FRAMEWORK_SHARED_DEPS` is empty. If your remote uses any lib that the host also uses, declare it shared explicitly.
- Singleton versioning: mismatched `requiredVersion` ranges cause Module Federation to load a second copy. Keep host and remote `package.json` versions aligned.

### Shadow DOM — Recommended for Non-React CSS

CSS from Vue SFCs, Svelte's scoped styles, or Solid stylesheets can bleed into or be overridden by the host's global styles. Using `shadowDom={{ mode: 'open' }}` on `UniversalRemoteMount` encapsulates the remote's DOM and styles completely:

```tsx
<UniversalRemoteMount
  module={() => import('vueRemote/App')}
  shadowDom={{ mode: 'open' }}   // ← isolate styles
/>
```

- The `container` passed to `mount(container, props)` will be the `ShadowRoot` when Shadow DOM is enabled.
- Ensure fonts and global CSS variables the remote needs are either inlined or passed via CSS custom properties on the host element.
- Use `mode: 'closed'` for stronger encapsulation (the shadow root won't be accessible from outside JS).

### `update` vs Re-mount

- If the host passes new props, `UniversalRemoteMount` calls `instance.update(newProps)` if available, avoiding a full re-mount.
- Implement `update` in your lifecycle instance for smooth prop transitions (especially important for Vue/Solid where framework reactivity can handle this cheaply).

### Cleanup Discipline

Always clean up event subscriptions, timers, and DOM mutations inside `unmount` or the teardown function you return from `mount`. Memory leaks in remotes compound quickly in SPAs where remotes mount and unmount frequently.

### TypeScript Module Declarations

Declare your remote modules so TypeScript resolves imports:

```typescript
// src/remotes.d.ts  (in the host project)
declare module 'vueRemote/App' {
  const module: { mount: (container: HTMLElement | ShadowRoot, props?: Record<string, any>) => any };
  export default module;
}

declare module 'svelteRemote/App' {
  const module: { mount: (container: HTMLElement | ShadowRoot, props?: Record<string, any>) => any };
  export default module;
}
```

### Development Workflow

- Run all remotes and the host concurrently (e.g., with `concurrently` or Turborepo).
- Each remote's dev server must be started **before** the host, or federation will fail to resolve remote entries.
- Use `http://localhost:<port>/assets/remoteEntry.js` as the remote URL in host config during development.

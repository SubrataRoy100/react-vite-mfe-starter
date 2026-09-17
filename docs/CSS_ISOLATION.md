# CSS Isolation in Micro-Frontends

This guide explains how CSS isolation works in this MFE architecture, the tools available, and the trade-offs to consider when building federated applications.

---

## Table of Contents

1. [Why CSS Isolation Matters](#1-why-css-isolation-matters)
2. [How Remote CSS Is Loaded — `federationCssFixPlugin`](#2-how-remote-css-is-loaded--federationcssfixplugin)
3. [Shadow DOM Isolation — `shadowDom` Prop](#3-shadow-dom-isolation--shadowdom-prop)
4. [Internal Mechanics](#4-internal-mechanics)
5. [Trade-offs](#5-trade-offs)
6. [Complete End-to-End Example](#6-complete-end-to-end-example)

---

## 1. Why CSS Isolation Matters

In a micro-frontend architecture, multiple independently built and deployed apps share the same browser page. Without isolation, CSS from one remote can silently bleed into the host or into other remotes:

- A remote ships `.button { color: red }` — it overrides the host's buttons.
- The host has a `.card` rule — it accidentally styles the remote's card components.
- Two remotes define conflicting utility classes (e.g. Tailwind `p-4` from different versions).

Two complementary mechanisms address this:

| Mechanism | What it solves |
|---|---|
| **`federationCssFixPlugin`** | Ensures remote CSS bundles are actually loaded in the browser when the remote is consumed |
| **`shadowDom` prop** | Provides hard encapsulation — remote styles are scoped to a Shadow Root and cannot leak out or be affected by host styles |

---

## 2. How Remote CSS Is Loaded — `federationCssFixPlugin`

### What the plugin does

`federationCssFixPlugin` (exported from `@subrataroy100/mfe-shared/vite`) is a Vite `post`-enforce plugin that performs two tasks when building a remote:

1. **Fixes a `__v__css__` placeholder bug** in `@originjs/vite-plugin-federation` template literals, where CSS chunk filenames are not correctly interpolated at build time.

2. **Prepends a runtime CSS auto-injector** to the generated `remoteEntry.js`. When a host loads the remote entry, the injector automatically appends all of the remote's CSS bundle files as `<link rel="stylesheet">` tags into `document.head` — so remote styles are available the moment the module is consumed, without any manual link injection.

### Automatic inclusion via `defineRemoteConfig`

If you configure your remote using the `defineRemoteConfig` preset, **`federationCssFixPlugin` is already included automatically**. You do not need to add it yourself:

```javascript
// remote/vite.config.js
import { defineRemoteConfig } from '@subrataroy100/mfe-shared/vite';

export default defineRemoteConfig({
  name: 'myRemote',
  exposes: {
    './App': './src/App',
  },
  // federationCssFixPlugin is wired in automatically
});
```

### Manual installation

If you are **not** using the `defineRemoteConfig` preset, add the plugin explicitly to your remote's (or host's) Vite config:

```javascript
// vite.config.js (remote or host)
import { defineConfig } from 'vite';
import federation from '@originjs/vite-plugin-federation';
import { federationCssFixPlugin } from '@subrataroy100/mfe-shared/vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'myRemote',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App',
      },
      shared: ['react', 'react-dom'],
    }),
    federationCssFixPlugin(), // add after federation plugin
  ],
  build: {
    target: 'esnext',
  },
});
```

> **Note:** The plugin sets `enforce: 'post'` internally, so it always runs after other plugins have processed the output. You do not need to configure this yourself.

---

## 3. Shadow DOM Isolation — `shadowDom` Prop

`UniversalRemoteMount` accepts a `shadowDom` prop that tells it to mount the remote inside a [Shadow Root](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot), completely encapsulating all remote styles.

### Prop type

```typescript
shadowDom?: boolean | ShadowRootInit;
```

### Behaviour

| `shadowDom` value | Effect |
|---|---|
| `undefined` / `false` | Remote mounts in the **light DOM**. No style encapsulation. |
| `true` | Creates an **open** Shadow Root (`{ mode: 'open' }`). All remote styles are scoped inside it. |
| `{ mode: 'open' }` | Same as `true` — explicit open Shadow Root. |
| `{ mode: 'closed' }` | Creates a **closed** Shadow Root. Remote styles are scoped; external JS cannot access `shadowRoot`. |

When `shadowDom` is set (any truthy value), **both DOM lifecycle remotes and React component remotes** are mounted inside the shadow root. React components are **not** rendered directly into the host VDOM — instead `normalized.mount(mountTarget, props)` is called, which creates a React root inside the shadow root. This ensures React's own style injections also stay encapsulated.

### Usage examples

#### No isolation (default)

```tsx
import { UniversalRemoteMount } from '@subrataroy100/mfe-shared/react';

<UniversalRemoteMount
  module={loadRemote('myRemote/App')}
/>
```

Remote styles are global — they can bleed into the host.

---

#### Boolean `true` — open shadow root

```tsx
<UniversalRemoteMount
  module={loadRemote('myRemote/App')}
  shadowDom={true}
/>
```

Creates `{ mode: 'open' }` shadow root. Host JS can still read `element.shadowRoot`.

---

#### Explicit `ShadowRootInit` object — open

```tsx
<UniversalRemoteMount
  module={loadRemote('myRemote/App')}
  shadowDom={{ mode: 'open' }}
/>
```

Identical to `shadowDom={true}`.

---

#### Explicit `ShadowRootInit` object — closed

```tsx
<UniversalRemoteMount
  module={loadRemote('myRemote/App')}
  shadowDom={{ mode: 'closed' }}
/>
```

Strongest encapsulation. External JS cannot traverse into the shadow root via `element.shadowRoot` (returns `null`).

---

#### With a custom container class

```tsx
<UniversalRemoteMount
  module={loadRemote('myRemote/App')}
  shadowDom={{ mode: 'open' }}
  className="checkout-remote-wrapper"
/>
```

`className` sets the class on the host-side container element (defaults to `'universal-remote-container'`). The shadow root is attached to this container.

---

## 4. Internal Mechanics

### `getTargetContainer` helper

Internally, `UniversalRemoteMount` uses a `getTargetContainer(container, shadowDom)` helper to resolve the actual DOM node that the remote mounts into:

- `shadowDom` is falsy → returns the **light DOM** `container` directly.
- `shadowDom` is truthy → checks if `container.shadowRoot` already exists; if not, calls `container.attachShadow(options)` with the resolved `ShadowRootInit`. Returns the shadow root.

### React remotes with `shadowDom`

Without `shadowDom`, a React remote component is rendered directly inside the host's React VDOM tree (standard React rendering). When `shadowDom` is set, this path is bypassed — the component's `mount(targetContainer, props)` method is called imperatively, creating an isolated React root inside the shadow root. This means the remote's React tree is completely separate from the host's.

### DOM lifecycle remotes

Remotes that expose a `{ mount, unmount }` contract are always mounted via `mount(targetContainer, props)`. With `shadowDom`, `targetContainer` is the shadow root; without it, `targetContainer` is the light DOM container.

### Cleanup

On unmount, `UniversalRemoteMount` calls the remote's `unmount` with a reference to the same shadow root (or light DOM container) that was used during mount, ensuring React roots and other DOM mutations are cleaned up correctly.

---

## 5. Trade-offs

### Without `shadowDom`

| ✅ Pros | ❌ Cons |
|---|---|
| Host global styles (fonts, resets, theme vars) cascade into the remote | Remote styles can bleed into host and other remotes |
| No extra DOM layer | CSS specificity conflicts are possible |
| Slightly simpler debugging | Styles from different MFE versions can clash |

### With `shadowDom`

| ✅ Pros | ❌ Cons |
|---|---|
| Complete style encapsulation — remote styles cannot leak out | Host global styles do **not** cascade into the shadow root |
| No CSS specificity conflicts between host and remote | You must manually adopt host stylesheets or inject theme tokens |
| Safe for third-party remotes or teams with independent style systems | Slightly more DOM overhead |
| Works for both DOM and React remotes | Closed mode makes debugging harder |

### Sharing host styles into a shadow root

If you need host design tokens or global styles inside a shadow root, you can adopt them via the [Constructable Stylesheets API](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet):

```javascript
// Inside the remote's mount function
const sheet = new CSSStyleSheet();
sheet.replaceSync(':host { --primary: #0057ff; }');
shadowRoot.adoptedStyleSheets = [sheet];
```

Or inject a `<link>` pointing to the host's CSS inside the shadow root after mounting.

---

## 6. Complete End-to-End Example

### Remote setup (`myRemote/vite.config.js`)

```javascript
import { defineRemoteConfig } from '@subrataroy100/mfe-shared/vite';

export default defineRemoteConfig({
  name: 'myRemote',
  exposes: {
    './Checkout': './src/Checkout',
  },
  shared: ['react', 'react-dom'],
  // federationCssFixPlugin included automatically
});
```

### Remote component (`myRemote/src/Checkout.tsx`)

```tsx
import './Checkout.css'; // these styles will be shadow-root scoped on the host

export default function Checkout() {
  return (
    <div className="checkout-root">
      <h1>Checkout</h1>
      {/* ... */}
    </div>
  );
}
```

### Host setup (`host/vite.config.js`)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'host',
      remotes: {
        myRemote: 'http://localhost:3001/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: { target: 'esnext' },
});
```

### Host app (`host/src/App.tsx`)

```tsx
import { loadRemote } from '@module-federation/runtime';
import { UniversalRemoteMount } from '@subrataroy100/mfe-shared/react';

export default function App() {
  return (
    <main>
      <h1>Host App</h1>

      {/* No isolation — remote styles are global */}
      <UniversalRemoteMount
        module={loadRemote('myRemote/Checkout')}
        className="checkout-light"
      />

      {/* Full isolation — remote styles scoped to shadow root */}
      <UniversalRemoteMount
        module={loadRemote('myRemote/Checkout')}
        shadowDom={{ mode: 'open' }}
        className="checkout-isolated"
      />

      {/* Closed shadow root — strongest encapsulation */}
      <UniversalRemoteMount
        module={loadRemote('myRemote/Checkout')}
        shadowDom={{ mode: 'closed' }}
        className="checkout-closed"
      />
    </main>
  );
}
```

When `shadowDom` is provided:
- The `Checkout` component's styles from `Checkout.css` are injected inside the shadow root and have no effect on the host page.
- The host's own CSS rules do not cascade into the shadow root.
- The remote's React tree is mounted imperatively inside the shadow root, fully isolated from the host VDOM.

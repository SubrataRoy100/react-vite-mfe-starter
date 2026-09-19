# Runtime Configuration & Event Architecture

This guide explains dynamic remote resolution, runtime environment overrides, type-safe cross-micro-frontend event communication, and production deployment caching strategies.

---

## 1. Dynamic Remote URL Overrides

In enterprise environments, micro-frontends are frequently deployed to ephemeral review environments, staging clusters, or regional CDNs independently of the host container shell. Rebuilding the host shell for every remote deployment is impractical.

This starter implements real dynamic remote URL resolution through a two-tier mechanism:

### Tier 1: Build-Time & Environment File Fallbacks (`.env`)
Host `vite.config.js` uses Vite's `loadEnv()` helper to read variables prefixed with `VITE_*_URL` directly from the workspace root or shell directory:

```env
# .env
VITE_MARKETING_MFE_URL=http://localhost:5002/mf-manifest.json
VITE_AUTH_MFE_URL=http://localhost:5003/mf-manifest.json
```

### Tier 2: Dynamic Runtime Injection (`window.__MFE_RUNTIME_CONFIG__`)
At runtime in the browser, operations or edge proxies can inject remote URLs directly into the host HTML before scripts execute:

```html
<!-- index.html or injected by server edge worker -->
<script>
  window.__MFE_RUNTIME_CONFIG__ = {
    marketingMfe: "https://cdn.example.com/marketing/latest/mf-manifest.json",
    authMfe: "https://cdn.example.com/auth/v2.1/mf-manifest.json"
  };
</script>
```

### How the Module Federation 2.0 Plugin Intercepts Requests
The host registers a custom runtime plugin (`packages/host/src/plugins/runtimeRemoteOverride.js`):
- `beforeRegisterRemote`: Intercepts remote manifest registration and replaces entry URLs with runtime overrides if present on `window.__MFE_RUNTIME_CONFIG__`.
- `beforeRequest`: Dynamically rewrites HTTP manifest requests to target the specified CDN URL.

The resolver function (`resolveRemoteUrl.js`) handles both local dev servers, containerized setups, and edge CDN URLs cleanly.

---

## 2. Type-Safe Cross-MFE Event Bus

Micro-frontends should be decoupled and autonomous; they must not rely on shared global state containers (like a shared Redux or Zustand store) across disparate deployables.

Instead, inter-app communication is facilitated by the scoped, decoupled Event Bus provided by `@subrataroy100/mfe-shared/events`.

### Creating a Scoped Event Bus
```javascript
import { createMfeEventBus } from "@subrataroy100/mfe-shared/events";

// Instantiate scoped bus for your remote
const authBus = createMfeEventBus({
  sender: "authMfe",
  namespace: "auth",
});

// Emitting events
authBus.send("user:login", {
  userId: "usr_12345",
  roles: ["admin"],
});

// Listening to events
const unsubscribe = authBus.listen("user:logout", (payload) => {
  console.log("Logged out:", payload);
});

// Cleanup listener on unmount
unsubscribe();
```

### Event Replay Across Asynchronously Loaded Remotes
In micro-frontend architectures, remotes are loaded on-demand via route navigation or lazy code splitting. If a producer emits an important event before a consumer remote is fetched and mounted, the consumer will miss the message by default.

To solve this, `@subrataroy100/mfe-shared` supports **Event Replay** via `{ replayLast: true }`:

```javascript
// Auth remote mounted at startup sends login status
authBus.send("auth:user_session", { userId: "usr_123", role: "editor" });

// ... minutes later, user navigates to /analytics which lazy-loads Analytics remote:
const unsub = analyticsBus.listen("auth:user_session", (session) => {
  // Immediately called with the cached { userId: "usr_123", role: "editor" } payload!
  initAnalytics(session.userId);
}, { replayLast: true });
```

### Reactive Cross-MFE State (`useMfeEventState`)
When micro-frontends need shared state synchronization (such as active organization, current theme, or user profile) without bundling monolithic state libraries across independent builds, use `useMfeEventState`:

```jsx
// In Navigation MFE:
import { useMfeEventState } from "@subrataroy100/mfe-shared";

export function ThemePicker() {
  const [theme, setTheme] = useMfeEventState("app:theme", "light");

  return (
    <button onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}>
      Toggle Theme (Current: {theme})
    </button>
  );
}

// In Dashboard MFE (completely separate build/bundle):
import { useMfeEventState } from "@subrataroy100/mfe-shared";

export function Dashboard() {
  // Automatically syncs whenever any remote updates "app:theme"
  const [theme] = useMfeEventState("app:theme", "light");

  return <div className={`dashboard-theme-${theme}`}>Dashboard Content</div>;
}
```

#### Imperative State Access
For non-React code, pure vanilla JS micro-frontends, or outside the component lifecycle:
```javascript
import { getMfeState, setMfeState, listenMfeState } from "@subrataroy100/mfe-shared";

// Set state imperatively
setMfeState("app:user", { id: 42, name: "Alice" });

// Read current value synchronously
const currentUser = getMfeState("app:user");

// Listen for updates
const unsubscribe = listenMfeState("app:user", (user) => {
  console.log("User changed to:", user);
});
```

### React Hook Event Listener (`useMfeEventListener`)
Inside React components, use `useMfeEventListener` for automatic subscription management, optional replay, and unmount cleanup:

```jsx
import React, { useState } from "react";
import { useMfeEventListener, sendMfeEvent, MFE_EVENTS } from "@subrataroy100/mfe-shared";

export function HostNotificationFeed() {
  const [messages, setMessages] = useState([]);

  // Automatically cleans up listener on component unmount and replays if available
  useMfeEventListener(
    MFE_EVENTS.NOTIFICATION,
    (detail) => {
      setMessages((prev) => [...prev, detail.message]);
    },
    { replayLast: true }
  );

  const handleBroadcast = () => {
    sendMfeEvent(MFE_EVENTS.PING, {
      sender: "host",
      timestamp: Date.now(),
    });
  };

  return (
    <div>
      <button onClick={handleBroadcast}>Broadcast Ping</button>
      <ul>
        {messages.map((msg, i) => <li key={i}>{msg}</li>)}
      </ul>
    </div>
  );
}
```

---

## 3. Universal Mount Adapters & Shadow DOM Isolation

The library `@subrataroy100/mfe-shared/adapters` includes adapters for rendering remotes across framework boundaries or isolating styles:

### Dual-Mode Mount (`createReactMount`)
Allows a React component to be consumed either directly as a React component OR imperatively mounted to an arbitrary DOM element:

```jsx
// In Remote:
import { createReactMount } from "@subrataroy100/mfe-shared/adapters";

function MyWidget({ title }) {
  return <div>{title}</div>;
}

export default createReactMount(MyWidget);
```

### Universal Remote Mount with Shadow DOM
```jsx
// In Host:
import { UniversalRemoteMount } from "@subrataroy100/mfe-shared/adapters";

export function IsolatedView() {
  return (
    <UniversalRemoteMount
      loadRemote={() => import("analyticsMfe/Dashboard")}
      props={{ refreshInterval: 5000 }}
      shadowDom={{ mode: "open" }}
      fallback={<div>Loading remote analytics...</div>}
      errorFallback={(err, retry) => (
        <div>
          <p>Failed: {err.message}</p>
          <button onClick={retry}>Retry</button>
        </div>
      )}
    />
  );
}
```

---

## 4. Production Edge Deployment & HTTP Cache Rules

When deploying micro-frontends to modern cloud platforms (Netlify, Vercel, AWS CloudFront, Cloudflare Pages), caching configuration is critical:

### The Golden Rule of Micro-Frontend Caching:
1. **Manifest and Entrypoints Must Never Be Cached:**
   `mf-manifest.json` and `remoteEntry.js` serve as the routing table and entry lookup for the remote. They must always return fresh representations:
   ```http
   Cache-Control: no-cache, no-store, must-revalidate
   ```
2. **Hashed Assets Must Be Cached Permanently:**
   Code chunks under `/assets/*` include content hashes in their file names (e.g. `App-Ba93df.js`). These should be cached with max immutable lifetimes:
   ```http
   Cache-Control: public, max-age=31536000, immutable
   ```

### Pre-Configured Edge Configurations
- **Netlify:** Defined in `netlify.toml` with `[[headers]]` blocks for `/remoteEntry.js`, `/mf-manifest.json`, and `/assets/*`.
- **Vercel:** Defined in `vercel.json` with matching route header rules.

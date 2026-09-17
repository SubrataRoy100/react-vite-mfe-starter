# Runtime Configuration Guide

This guide covers how Micro-Frontend (MFE) remote URLs are resolved at build time and at runtime, the shape of `remotes.manifest.json`, how to inject configuration dynamically without rebuilding, and the production caching strategy for deployed remotes.

---

## 1. `remotes.manifest.json` — Schema and Purpose

The file at the **monorepo root** (`remotes.manifest.json`) is the single source of truth for every remote MFE in the workspace. Both the host's `vite.config.js` and the `defineRemoteConfig` helper read from it automatically.

### Schema

```json
{
  "<remoteName>": {
    "port": 5001,
    "path": "/demo",
    "entry": "/remoteEntry.js",
    "envVar": "VITE_DEMO_SERVICE_URL"
  }
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `port` | `number` | Dev-server port for the remote. Auto-applied by `defineRemoteConfig` and used as the local fallback URL in the host. |
| `path` | `string` | Mount path of the remote in the host shell (used for routing, not URL construction). |
| `entry` | `string` | Path to the remote entry file, appended to the base URL to form the full fallback URL (e.g. `/remoteEntry.js`). |
| `envVar` | `string` | Name of the build-time environment variable that overrides the local fallback. |

### Current manifest

```json
{
  "demoService": {
    "port": 5001,
    "path": "/demo",
    "entry": "/remoteEntry.js",
    "envVar": "VITE_DEMO_SERVICE_URL"
  }
}
```

### Adding a new remote

Drop a new entry into `remotes.manifest.json`. The host's `vite.config.js` iterates every key at build time — no manual edits to `vite.config.js` are required.

---

## 2. URL Resolution Priority

At build time the host generates an async `Promise.resolve(...)` expression for each remote. When the host shell runs in the browser it evaluates:

```javascript
// Generated for each remote in packages/host/vite.config.js
const remotes = Object.fromEntries(
  Object.entries(remotesManifest).map(([name, cfg]) => {
    const fallbackUrl =
      process.env[cfg.envVar] || `http://localhost:${cfg.port}${cfg.entry}`;
    return [
      name,
      {
        external: `Promise.resolve((typeof window !== 'undefined' && window.__MFE_RUNTIME_CONFIG__ && window.__MFE_RUNTIME_CONFIG__[${JSON.stringify(name)}]) || ${JSON.stringify(fallbackUrl)})`,
        externalType: 'promise',
      },
    ];
  })
);
```

This produces the following three-tier lookup, evaluated **in order at runtime**:

| Priority | Source | When it wins |
|----------|--------|-------------|
| **1 — highest** | `window.__MFE_RUNTIME_CONFIG__[name]` | Injected into the HTML at request time by an edge function, CDN, or server. Takes effect without rebuilding. |
| **2** | `process.env[cfg.envVar]` (e.g. `VITE_DEMO_SERVICE_URL`) | Set at **build time**. Baked into the `fallbackUrl` string when the bundle is compiled. |
| **3 — lowest** | `http://localhost:{port}{entry}` | Derived from the manifest (`port` + `entry`). Used when no env var is set — typically local development. |

For `demoService` the resolved chain is:

```
window.__MFE_RUNTIME_CONFIG__.demoService
  || VITE_DEMO_SERVICE_URL (build-time)
  || http://localhost:5001/remoteEntry.js (manifest fallback)
```

> **Important:** Priorities 2 and 3 are resolved at **build time** and frozen into the bundle as a single string (`fallbackUrl`). Only priority 1 (`window.__MFE_RUNTIME_CONFIG__`) is truly dynamic and can be changed without rebuilding.

---

## 3. `window.__MFE_RUNTIME_CONFIG__` — Dynamic Injection

### What it is

`window.__MFE_RUNTIME_CONFIG__` is a plain JavaScript object keyed by **remote name** (matching the key in `remotes.manifest.json`). Its values are fully-qualified URLs pointing to each remote's `remoteEntry.js`.

### Minimal example

```html
<script>
  window.__MFE_RUNTIME_CONFIG__ = {
    demoService: 'https://cdn.example.com/demo/remoteEntry.js'
  };
</script>
```

This script block must appear **before** the host's main bundle is executed. Place it as the first `<script>` tag inside `<head>`.

### When to use it

Use runtime injection whenever the remote URL is not known at host build time — for example when remotes are deployed independently to a CDN, or when different environments (staging, canary, production) serve different remote versions.

### Injection strategies

#### A. Static HTML insert (simplest)

Directly embed the script in `index.html` for fixed environments:

```html
<!DOCTYPE html>
<html>
  <head>
    <script>
      window.__MFE_RUNTIME_CONFIG__ = {
        demoService: 'https://cdn.example.com/demo/remoteEntry.js'
      };
    </script>
    <!-- rest of head -->
  </head>
</html>
```

#### B. Netlify Edge Function

Create `netlify/edge-functions/inject-mfe-config.ts`:

```typescript
import type { Context } from '@netlify/edge-functions';

export default async function handler(request: Request, context: Context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html')) {
    const text = await response.text();
    const runtimeConfig = {
      demoService: Deno.env.get('REMOTE_DEMO_SERVICE_URL') || 'https://demo.example.com/remoteEntry.js',
    };

    const injected = text.replace(
      '<head>',
      `<head><script>window.__MFE_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};</script>`
    );

    return new Response(injected, response);
  }

  return response;
}

export const config = { path: '/*' };
```

#### C. Vercel Edge Middleware

Create `middleware.js` at the repo root:

```javascript
export default async function middleware(request) {
  const response = await fetch(request);
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html')) {
    const html = await response.text();
    const runtimeConfig = {
      demoService: process.env.REMOTE_DEMO_SERVICE_URL || 'https://demo.example.com/remoteEntry.js',
    };

    const injected = html.replace(
      '<head>',
      `<head><script>window.__MFE_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};</script>`
    );

    return new Response(injected, {
      status: response.status,
      headers: response.headers,
    });
  }

  return response;
}
```

#### D. Express / Node.js Server

```javascript
app.use((req, res, next) => {
  if (req.accepts('html')) {
    const runtimeConfig = {
      demoService: process.env.REMOTE_DEMO_SERVICE_URL,
    };
    const html = fs.readFileSync('dist/index.html', 'utf-8').replace(
      '<head>',
      `<head><script>window.__MFE_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};</script>`
    );
    res.send(html);
  } else {
    next();
  }
});
```

#### E. Docker / Nginx with `envsubst`

**`nginx.conf.template`**:

```nginx
server {
  listen 80;
  location / {
    sub_filter '<head>'
               '<head><script>window.__MFE_RUNTIME_CONFIG__ = { "demoService": "${DEMO_SERVICE_URL}" };</script>';
    sub_filter_once on;
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
  }
}
```

Run `envsubst` in the Docker entrypoint before starting Nginx to expand `${DEMO_SERVICE_URL}` from the container's environment.

---

## 4. Environment Variables for Build-Time Configuration

Build-time env vars are baked into the `fallbackUrl` when the host bundle is compiled. They sit at **priority 2** — above the manifest default, below runtime injection.

| Variable | Remote | Example value |
|----------|--------|---------------|
| `VITE_DEMO_SERVICE_URL` | `demoService` | `https://staging-cdn.example.com/demo/remoteEntry.js` |
| `HOST_PORT` | host server port | `5000` |

### Setting them

**`.env.production`** (host package):

```
VITE_DEMO_SERVICE_URL=https://cdn.example.com/demo/remoteEntry.js
```

**CI/CD pipeline** (Netlify / Vercel environment variables UI, GitHub Actions secrets):

```yaml
env:
  VITE_DEMO_SERVICE_URL: https://cdn.example.com/demo/remoteEntry.js
```

> **Note:** Because this value is resolved at **build time**, the host bundle must be rebuilt whenever a build-time URL changes. Use `window.__MFE_RUNTIME_CONFIG__` (priority 1) for URLs that change between deployments without rebuilding.

### Host port resolution

The host resolves its own dev/preview port in this order:

```javascript
const hostPort = Number(process.env.HOST_PORT || remotesManifest?.host?.port || 5000);
```

1. `HOST_PORT` environment variable
2. `host.port` field in `remotes.manifest.json` (if present)
3. Hard-coded default `5000`

---

## 5. Port Auto-Resolution in `defineRemoteConfig`

`defineRemoteConfig` (from `@subrataroy100/mfe-shared/vite`) automatically looks up the remote's port from `remotes.manifest.json` so remote packages do not need to hard-code it.

### How it works

1. If `port` is **not** explicitly passed in the options, `defineRemoteConfig` calls `findManifest()`.
2. `findManifest()` walks **up** the directory tree from `process.cwd()` until it finds `remotes.manifest.json`.
3. It reads `manifest[name].port` and uses that value for both `server.port` and `preview.port`.
4. `strictPort: true` is set so Vite fails fast if the port is already occupied.

### Minimal remote config (port auto-inferred)

```javascript
// packages/demoService/vite.config.js
import { defineRemoteConfig } from '@subrataroy100/mfe-shared/vite';

export default defineRemoteConfig({
  name: 'demoService',
  // Port 5001 is auto-inferred from remotes.manifest.json — no need to specify it here.
  exposes: {
    './App': './src/App.jsx',
    './MfeDevWidget': './src/components/MfeDevWidget.jsx',
  },
});
```

### Overriding the port explicitly

```javascript
export default defineRemoteConfig({
  name: 'demoService',
  port: 5099, // overrides manifest lookup
  exposes: { './App': './src/App.jsx' },
});
```

### Using a custom manifest path

```javascript
export default defineRemoteConfig({
  name: 'demoService',
  manifestPath: '/absolute/path/to/custom-remotes.manifest.json',
  exposes: { './App': './src/App.jsx' },
});
```

### `MFE_CONFIG` constants

The `@subrataroy100/mfe-shared/constants` package exports `MFE_CONFIG` with default ports and URLs that mirror the manifest values:

```javascript
import { MFE_CONFIG } from '@subrataroy100/mfe-shared/constants';

// MFE_CONFIG.HOST         → { NAME: 'host',        PORT: 5000, DEFAULT_URL: 'http://localhost:5000' }
// MFE_CONFIG.DEMO_SERVICE → { NAME: 'demoService',  PORT: 5001, DEFAULT_URL: 'http://localhost:5001', ENTRY_PATH: '/remoteEntry.js' }
```

Use these constants in application code (e.g. health checks, dev tools) instead of hard-coding port numbers.

---

## 6. Production Caching Strategy

Module Federation requires `remoteEntry.js` to have a **stable, un-hashed filename** so the host can always find it. This means it cannot be content-addressed and must therefore be served with headers that prevent caching. All other assets produced by Vite are content-hashed and can be cached forever.

### Cache-Control headers

| Resource | `Cache-Control` | Rationale |
|----------|-----------------|-----------|
| `/remoteEntry.js` | `no-cache, no-store, must-revalidate` | Stable filename, no hash. Every remote deploy must be picked up immediately by consuming hosts. |
| `/assets/*` | `public, max-age=31536000, immutable` | Content-hashed by Vite. Safe to cache for one year. |

`Access-Control-Allow-Origin: *` is applied to both, enabling cross-origin loading by host shells on different domains.

### Netlify (`netlify.toml`)

```toml
[[headers]]
  for = "/remoteEntry.js"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
    Access-Control-Allow-Origin = "*"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Access-Control-Allow-Origin = "*"
```

### Vercel (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/remoteEntry.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

> **Important:** If you deploy remotes to a custom CDN or object storage (S3, GCS, R2), configure the equivalent `Cache-Control` response headers there. Failing to set `no-cache` on `remoteEntry.js` will cause hosts to load stale remote bundles after a deploy.

---

## 7. Multi-Environment Setup

### Local development

No configuration needed beyond running the packages. Ports come from `remotes.manifest.json`:

| Package | Port |
|---------|------|
| `host` | `5000` |
| `demoService` | `5001` |

Start everything with:

```bash
pnpm dev
```

The host resolves `demoService` to `http://localhost:5001/remoteEntry.js` via the manifest fallback (priority 3).

### Staging

Build-time env var approach — rebuild the host with the staging remote URL baked in:

```
# .env.staging or CI environment variable
VITE_DEMO_SERVICE_URL=https://staging-cdn.example.com/demo/remoteEntry.js
```

Or, with no rebuild, inject at request time via an edge function (priority 1):

```javascript
// Edge function environment variable
REMOTE_DEMO_SERVICE_URL=https://staging-cdn.example.com/demo/remoteEntry.js
```

### Production

Preferred approach is runtime injection via edge function or CDN worker so the host never needs a rebuild when a remote is updated independently:

```html
<!-- Injected into <head> by edge function at request time -->
<script>
  window.__MFE_RUNTIME_CONFIG__ = {
    demoService: 'https://cdn.example.com/demo/remoteEntry.js'
  };
</script>
```

### Summary by environment

| Environment | Priority 1 (runtime) | Priority 2 (build-time env) | Priority 3 (manifest fallback) |
|-------------|----------------------|-----------------------------|-------------------------------|
| **Local dev** | — | — | `http://localhost:5001/remoteEntry.js` ✅ |
| **Staging** | Edge function injection | `VITE_DEMO_SERVICE_URL` | _(not reached)_ |
| **Production** | Edge function injection (recommended) | `VITE_DEMO_SERVICE_URL` (alternative) | _(not reached)_ |

---

## Verification

Open the host in a browser and run in the DevTools console:

```javascript
// Inspect what runtime config was injected
console.log(window.__MFE_RUNTIME_CONFIG__);

// Override a remote URL on-the-fly for testing (reload required)
window.__MFE_RUNTIME_CONFIG__ = {
  demoService: 'http://localhost:5001/remoteEntry.js'
};
```

Check the **Network** tab after a page reload: the URL of the `remoteEntry.js` request should match whatever is set in `window.__MFE_RUNTIME_CONFIG__.demoService`.

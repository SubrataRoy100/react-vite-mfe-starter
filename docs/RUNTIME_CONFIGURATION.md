# Production Remote URL Runtime Configuration Guide

In Vite Module Federation, remote entry URLs are compiled with an asynchronous resolution promise:

```javascript
external: `Promise.resolve((typeof window !== 'undefined' && window.__MFE_RUNTIME_CONFIG__ && window.__MFE_RUNTIME_CONFIG__['${name}']) || '${fallbackUrl}')`
```

This allows engineering teams to **redirect where a remote is loaded from without rebuilding the host container**.

---

## 1. How It Works

1. When the host shell loads in the browser, it checks `window.__MFE_RUNTIME_CONFIG__`.
2. If `window.__MFE_RUNTIME_CONFIG__[remoteName]` is set to a valid URL (e.g. `https://cdn.staging.example.com/remoteEntry.js`), the host dynamically fetches that remote entry.
3. If absent or undefined, the host automatically falls back to the build-time URL (e.g. `http://localhost:5001/remoteEntry.js` or `process.env.VITE_DEMO_SERVICE_URL`).

---

## 2. Injection Recipes

### A. Netlify Edge Function (Recommended for Netlify)

Create `netlify/edge-functions/inject-mfe-config.ts`:

```typescript
import type { Context } from "@netlify/edge-functions";

export default async function handler(request: Request, context: Context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    const text = await response.text();
    const runtimeConfig = {
      demoService: Deno.env.get("REMOTE_DEMO_SERVICE_URL") || "https://demo.example.com/remoteEntry.js",
    };

    const injected = text.replace(
      "<head>",
      `<head><script>window.__MFE_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};</script>`
    );

    return new Response(injected, response);
  }

  return response;
}

export const config = {
  path: "/*",
};
```

---

### B. Vercel Edge Middleware (Recommended for Vercel)

Create `middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  // Provide runtime config headers or use Edge HTML rewriting
  return response;
}
```

Or using an Edge HTML rewriter in standard Express/Node server:

```javascript
app.use((req, res, next) => {
  if (req.accepts("html")) {
    const config = {
      demoService: process.env.DEMO_SERVICE_URL,
    };
    // inject window.__MFE_RUNTIME_CONFIG__ = ... before </head>
  }
  next();
});
```

---

### C. Docker / Nginx Container (`envsubst`)

When deploying host via Nginx in Docker:

**`nginx.conf.template`**:
```nginx
server {
  listen 80;
  location / {
    sub_filter '<script>window.__MFE_RUNTIME_CONFIG__ = window.__MFE_RUNTIME_CONFIG__ || {};</script>'
               '<script>window.__MFE_RUNTIME_CONFIG__ = { demoService: "${DEMO_SERVICE_URL}" };</script>';
    sub_filter_once on;
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
  }
}
```

---

## 3. Verification

To verify in browser console or devtools:
```javascript
window.__MFE_RUNTIME_CONFIG__ = {
  demoService: "http://localhost:5001/remoteEntry.js"
};
```
Navigate to `/demo` and observe network requests targeting the designated URL.

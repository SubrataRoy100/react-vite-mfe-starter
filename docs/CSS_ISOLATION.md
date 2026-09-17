# Micro-Frontend CSS Isolation Guide

In micro-frontend architectures, styling conflicts between the host shell and remote applications can emerge when CSS selectors collide or reset styles clash.

This guide outlines the default styling approach, the architectural trade-offs, and concrete opt-in isolation strategies.

---

## 1. Default Setup: Shared Tailwind CSS Utility Architecture

By default, the starter project configures `@tailwindcss/vite` across both the host and remotes:

- **Advantage**: Shared design tokens (colors, spacing, typography) and zero runtime CSS-in-JS overhead.
- **Trade-off**: Remotes inject CSS `<link>` tags into `document.head`. Because styles are globally scoped to the document, an unqualified selector (e.g. `button { margin: 0 }` or utility collisions) can influence siblings or the host container.

For many enterprise applications with a unified design system, this is acceptable. When teams need strict CSS isolation, choose one of the three strategies below.

---

## 2. Opt-in Isolation Strategies

### Strategy A: Shadow DOM Encapsulation (Recommended for Non-React & Vanilla)

Shadow DOM guarantees 100% style encapsulation by preventing external styles from penetrating the shadow boundary, and internal styles from leaking out.

Using `createVanillaMount`, you can attach a shadow root:

```javascript
import { createVanillaMount } from "@mfe/shared/adapters";

export const { mount } = createVanillaMount((container, props) => {
  // Attach shadow root if not already present
  const shadow = container.shadowRoot || container.attachShadow({ mode: "open" });

  // Inject remote stylesheet into the shadow root
  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = new URL("./style.css", import.meta.url).href;
  shadow.appendChild(styleLink);

  const wrapper = document.createElement("div");
  wrapper.className = "remote-content";
  wrapper.innerHTML = `<h1>${props.title}</h1>`;
  shadow.appendChild(wrapper);

  return () => {
    shadow.innerHTML = "";
  };
});
```

---

### Strategy B: Scoped Tailwind Prefix / Class Namespaces

If teams prefer to retain utility classes without Shadow DOM overhead:

1. In the remote's Tailwind configuration or root CSS, scope all utility classes with a prefix or class wrapper:
   ```css
   @layer theme, base, components, utilities;
   @scope (.mfe-demo-service) {
     /* All remote utilities and component rules scoped here */
   }
   ```
2. Or use Tailwind's `prefix` option:
   ```css
   @theme {
     --prefix-mfe: demo-;
   }
   ```
   Producing classes like `demo-bg-blue-600`, `demo-p-4`.

---

### Strategy C: CSS Modules or Svelte/Vue Scoped Styles

For Vue or Svelte micro-frontends:
- Vue `<style scoped>` automatically attaches unique attribute selectors (e.g. `[data-v-f3f3eg9]`).
- Svelte components automatically scope styles at compile-time.
- React CSS Modules (`*.module.css`) generate locally scoped class names like `Header_title__1a2b3`.

---

## 3. Summary of Trade-offs

| Strategy | Isolation Level | Global Token Sharing | Implementation Effort |
| :--- | :--- | :--- | :--- |
| **Shared Tailwind (Default)** | Document-level | Seamless | Zero setup |
| **Shadow DOM** | Complete (hard boundary) | Requires manual token injection | Low (via `attachShadow`) |
| **Scoped Namespace (`@scope`)** | CSS selector boundary | Preserved | Low (wrap root container) |
| **CSS Modules / Scoped Style** | Component-level | Preserved | Standard framework tooling |

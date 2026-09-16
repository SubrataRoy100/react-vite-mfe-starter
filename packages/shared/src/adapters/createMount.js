import React from "react";
import { createRoot } from "react-dom/client";

/**
 * Creates a universal lifecycle contract `{ mount, unmount }` for a React component.
 * Used by React micro-frontends to expose a framework-agnostic mount function.
 *
 * @param {React.ComponentType<any>} Component
 * @returns {{ mount: (container: HTMLElement, props?: Record<string, any>) => { update?: (props: Record<string, any>) => void, unmount: () => void } }}
 */
export function createReactMount(Component) {
  return {
    mount(container, initialProps = {}) {
      const root = createRoot(container);
      root.render(React.createElement(Component, initialProps));

      return {
        update(nextProps) {
          root.render(React.createElement(Component, nextProps));
        },
        unmount() {
          root.unmount();
        },
      };
    },
  };
}

/**
 * Creates a universal lifecycle contract `{ mount, unmount }` for a Vanilla JS micro-frontend.
 *
 * @param {(container: HTMLElement, props?: Record<string, any>) => (() => void) | void} renderFn
 * @returns {{ mount: (container: HTMLElement, props?: Record<string, any>) => { update?: (props: Record<string, any>) => void, unmount: () => void } }}
 */
export function createVanillaMount(renderFn) {
  return {
    mount(container, initialProps = {}) {
      let currentProps = { ...initialProps };
      let cleanup = renderFn(container, currentProps);

      return {
        update(nextProps) {
          currentProps = { ...nextProps };
          if (typeof cleanup === "function") {
            cleanup();
          }
          cleanup = renderFn(container, currentProps);
        },
        unmount() {
          if (typeof cleanup === "function") {
            cleanup();
          } else {
            container.innerHTML = "";
          }
        },
      };
    },
  };
}

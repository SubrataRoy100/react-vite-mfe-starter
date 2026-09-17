import React from "react";
import { createRoot } from "react-dom/client";

/**
 * Creates a universal lifecycle contract `{ mount, unmount }` for a React component.
 * Upgraded to dual-mode: can be used directly as a React functional component in JSX,
 * or as a framework-agnostic mount object via `.mount(container, props)`.
 *
 * @param {React.ComponentType<any>} Component
 * @returns {React.FC<any> & {
 *   mount: (container: HTMLElement | ShadowRoot, props?: Record<string, any>) => {
 *     update?: (props: Record<string, any>) => void;
 *     unmount: () => void;
 *   };
 *   Component: React.ComponentType<any>;
 * }}
 */
export function createReactMount(Component) {
  function DualModeMountComponent(props) {
    return React.createElement(Component, props);
  }

  DualModeMountComponent.Component = Component;

  DualModeMountComponent.mount = function mount(container, initialProps = {}) {
    const root = createRoot(container);
    let isUnmounted = false;

    root.render(React.createElement(Component, initialProps));

    return {
      update(nextProps) {
        if (!isUnmounted) {
          root.render(React.createElement(Component, nextProps));
        }
      },
      unmount() {
        if (!isUnmounted) {
          isUnmounted = true;
          // React 19 safe microtask teardown to avoid unmounting during concurrent transitions
          queueMicrotask(() => {
            try {
              root.unmount();
            } catch {
              // Ignore if root already cleaned up
            }
          });
        }
      },
    };
  };

  return DualModeMountComponent;
}

/**
 * Creates a universal lifecycle contract `{ mount, unmount }` for a Vanilla JS micro-frontend.
 *
 * @param {(container: HTMLElement | ShadowRoot, props?: Record<string, any>) => (() => void) | void} renderFn
 * @returns {{
 *   mount: (container: HTMLElement | ShadowRoot, props?: Record<string, any>) => {
 *     update?: (props: Record<string, any>) => void;
 *     unmount: () => void;
 *   };
 *   renderFn: Function;
 * }}
 */
export function createVanillaMount(renderFn) {
  return {
    renderFn,
    mount(container, initialProps = {}) {
      let currentProps = { ...initialProps };
      let cleanup = renderFn(container, currentProps);

      return {
        update(nextProps) {
          currentProps = { ...nextProps };
          if (typeof cleanup === "function") {
            try {
              cleanup();
            } catch (err) {
              console.error("[createVanillaMount] Error during cleanup on update:", err);
            }
          }
          cleanup = renderFn(container, currentProps);
        },
        unmount() {
          if (typeof cleanup === "function") {
            try {
              cleanup();
            } catch (err) {
              console.error("[createVanillaMount] Error during unmount cleanup:", err);
            }
          } else if (container && typeof container.innerHTML === "string") {
            container.innerHTML = "";
          }
        },
      };
    },
  };
}

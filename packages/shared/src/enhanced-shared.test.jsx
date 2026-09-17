import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  createMfeEventBus,
  sendMfeEvent,
  listenMfeEvent,
  MFE_EVENTS,
  UniversalRemoteMount,
  normalizeRemoteModule,
  createReactMount,
  createVanillaMount,
} from "./index.js";
import {
  mergeSharedDeps,
  federationCssFixPlugin,
} from "./vite/index.js";

describe("Enhanced @subrataroy100/mfe-shared features", () => {
  describe("Scoped Event Bus Factory (createMfeEventBus)", () => {
    it("creates an event bus with scoped sender and namespace", () => {
      const bus = createMfeEventBus({ sender: "OrderRemote", namespace: "checkout" });
      expect(bus.sender).toBe("OrderRemote");
      expect(bus.namespace).toBe("checkout");
      expect(bus.resolveEventName("order_placed")).toBe("checkout:order_placed");
      // Does not double-prefix if already prefixed:
      expect(bus.resolveEventName("checkout:order_placed")).toBe("checkout:order_placed");
    });

    it("dispatches and listens to namespaced events cleanly", () => {
      const bus = createMfeEventBus({ sender: "OrderRemote", namespace: "checkout" });
      const handler = vi.fn();
      const unsubscribe = bus.listen("order_placed", handler);

      bus.send("order_placed", { orderId: "ORD-999", total: 150 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "ORD-999",
          total: 150,
          sender: "OrderRemote",
          namespace: "checkout",
        })
      );

      unsubscribe();
      bus.send("order_placed", { orderId: "ORD-1000", total: 200 });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("maintains backward compatibility with global sendMfeEvent and listenMfeEvent", () => {
      const handler = vi.fn();
      const unsub = listenMfeEvent(MFE_EVENTS.PING, handler);

      sendMfeEvent(MFE_EVENTS.PING, { message: "Global ping" });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Global ping",
        })
      );

      unsub();
    });
  });

  describe("Dual-Mode createReactMount", () => {
    function SampleWidget({ label = "Default Label" }) {
      return <div data-testid="sample-widget">Widget: {label}</div>;
    }

    it("works as a lifecycle contract with .mount, update, and unmount", () => {
      const mountObj = createReactMount(SampleWidget);
      expect(typeof mountObj.mount).toBe("function");
      expect(mountObj.Component).toBe(SampleWidget);

      const container = document.createElement("div");
      const instance = mountObj.mount(container, { label: "Test Mount" });

      expect(typeof instance.update).toBe("function");
      expect(typeof instance.unmount).toBe("function");
      instance.unmount();
    });

    it("can be rendered directly in JSX as a standard React component", () => {
      const DualComponent = createReactMount(SampleWidget);

      render(<DualComponent label="Rendered Directly in JSX" />);

      expect(screen.getByTestId("sample-widget")).toBeDefined();
      expect(screen.getByTestId("sample-widget").textContent).toBe("Widget: Rendered Directly in JSX");
    });
  });

  describe("createVanillaMount", () => {
    it("exposes renderFn and handles lifecycle safely", () => {
      const renderFn = (container, props) => {
        container.innerHTML = `<span data-testid="vanilla-span">${props.text}</span>`;
      };

      const mountObj = createVanillaMount(renderFn);
      expect(mountObj.renderFn).toBe(renderFn);

      const container = document.createElement("div");
      const instance = mountObj.mount(container, { text: "Vanilla Text" });

      expect(container.innerHTML).toContain("Vanilla Text");
      instance.update({ text: "Updated Vanilla Text" });
      expect(container.innerHTML).toContain("Updated Vanilla Text");
      instance.unmount();
      expect(container.innerHTML).toBe("");
    });
  });

  describe("normalizeRemoteModule", () => {
    it("normalizes a { mount } object", () => {
      const mountMock = vi.fn();
      const normalized = normalizeRemoteModule({ mount: mountMock });

      expect(normalized).toBeDefined();
      expect(typeof normalized.mount).toBe("function");
      normalized.mount("container", { a: 1 });
      expect(mountMock).toHaveBeenCalledWith("container", { a: 1 });
    });

    it("normalizes a raw React Component into a lifecycle contract", () => {
      function MyReactApp(props) {
        return <div>{props.name}</div>;
      }

      const normalized = normalizeRemoteModule(MyReactApp);
      expect(normalized).toBeDefined();
      expect(typeof normalized.mount).toBe("function");
      expect(normalized.Component).toBe(MyReactApp);
    });

    it("returns null for invalid or empty modules", () => {
      expect(normalizeRemoteModule(null)).toBeNull();
      expect(normalizeRemoteModule(undefined)).toBeNull();
    });
  });

  describe("UniversalRemoteMount with Shadow DOM isolation", () => {
    it("mounts remote inside shadowRoot when shadowDom: true is specified", async () => {
      const mockRemote = {
        mount: (target, props) => {
          target.innerHTML = `<div data-testid="shadow-content">${props.msg}</div>`;
          return () => {
            target.innerHTML = "";
          };
        },
      };

      const loadRemote = vi.fn().mockResolvedValue(mockRemote);

      const { container } = render(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          props={{ msg: "Isolated inside Shadow DOM" }}
          remoteName="ShadowRemote"
          shadowDom={true}
        />
      );

      await waitFor(() => {
        const wrapper = container.querySelector(".universal-remote-container");
        expect(wrapper).toBeDefined();
        expect(wrapper.shadowRoot).toBeDefined();
        expect(wrapper.shadowRoot.innerHTML).toContain("Isolated inside Shadow DOM");
      });
    });

    it("supports module prop as a loader function", async () => {
      function MyModuleComp(props) {
        return <div data-testid="module-prop-comp">Module Prop Success: {props.name}</div>;
      }

      render(
        <UniversalRemoteMount
          module={() => Promise.resolve({ default: MyModuleComp })}
          props={{ name: "CartRemote" }}
          remoteName="CartRemote"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("module-prop-comp")).toBeDefined();
        expect(screen.getByTestId("module-prop-comp").textContent).toBe("Module Prop Success: CartRemote");
      });
    });

    it("supports module prop as a direct component or module object", async () => {
      function DirectComp(props) {
        return <div data-testid="direct-comp">Direct Component: {props.role}</div>;
      }

      render(
        <UniversalRemoteMount
          module={DirectComp}
          props={{ role: "Admin" }}
          remoteName="DirectRemote"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("direct-comp")).toBeDefined();
        expect(screen.getByTestId("direct-comp").textContent).toBe("Direct Component: Admin");
      });
    });

    it("renders custom errorFallback function when loading fails", async () => {
      const failLoader = () => Promise.reject(new Error("Network Timeout"));

      render(
        <UniversalRemoteMount
          module={failLoader}
          remoteName="FailingRemote"
          errorFallback={(err) => <div data-testid="custom-error">Custom Error: {err.message}</div>}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("custom-error")).toBeDefined();
        expect(screen.getByTestId("custom-error").textContent).toBe("Custom Error: Network Timeout");
      });
    });

    it("handles missing module/loadRemote gracefully without throwing unhandled exceptions", async () => {
      const onError = vi.fn();

      render(
        <UniversalRemoteMount
          remoteName="EmptyRemote"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0].message).toContain("No module or loadRemote function provided");
      });
    });
  });

  describe("Vite Federation Preset & CSS chunk injection", () => {
    it("injects automatic runtime CSS link injector when bundle contains .css files", () => {
      const mockBundle = {
        "remoteEntry.js": {
          code: 'var __v__css__ = "__v__css__"; console.log("remoteEntry loaded");',
        },
        "assets/style-abc123.css": {
          source: "body { background: red; }",
        },
      };

      federationCssFixPlugin.generateBundle({}, mockBundle);

      expect(mockBundle["remoteEntry.js"].code).toContain("[federation-css-fix]");
      expect(mockBundle["remoteEntry.js"].code).toContain("assets/style-abc123.css");
      expect(mockBundle["remoteEntry.js"].code).toContain("document.createElement('link')");
    });

    it("cleanly overrides shared dependency options without losing baseline singleton settings", () => {
      const merged = mergeSharedDeps("react", {
        react: { requiredVersion: "^18.2.0" },
      });

      expect(merged.react).toBeDefined();
      expect(merged.react.singleton).toBe(true);
      expect(merged.react.requiredVersion).toBe("^18.2.0");
      expect(merged["react-dom"].singleton).toBe(true);
    });
  });
});

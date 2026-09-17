import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  UniversalRemoteMount,
  createReactMount,
  createVanillaMount,
} from "./index.js";
import {
  sendMfeEvent,
  listenMfeEvent,
} from "../events/mfe-events.js";

describe("Universal Adapters & Framework-Agnostic Support", () => {
  describe("listenMfeEvent (Vanilla Cross-MFE Bus)", () => {
    it("subscribes to custom events and receives dispatched payloads", () => {
      const handler = vi.fn();
      const unsubscribe = listenMfeEvent("mfe:test-event", handler);

      sendMfeEvent("mfe:test-event", { message: "hello world" });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ message: "hello world" })
      );

      unsubscribe();

      sendMfeEvent("mfe:test-event", { message: "after unsub" });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("isolates errors when an event handler throws, preventing crashes", () => {
      const faultyHandler = vi.fn().mockImplementation(() => {
        throw new Error("Faulty handler error");
      });
      const healthyHandler = vi.fn();

      const unsub1 = listenMfeEvent("mfe:faulty-test", faultyHandler);
      const unsub2 = listenMfeEvent("mfe:faulty-test", healthyHandler);

      sendMfeEvent("mfe:faulty-test", { ok: true });

      expect(faultyHandler).toHaveBeenCalledTimes(1);
      expect(healthyHandler).toHaveBeenCalledTimes(1);

      unsub1();
      unsub2();
    });
  });

  describe("createVanillaMount", () => {
    it("mounts vanilla DOM content, updates props, and calls cleanup on unmount", () => {
      const cleanupMock = vi.fn();
      const { mount } = createVanillaMount((container, props) => {
        container.innerHTML = `<span data-testid="vanilla-title">${props.title}</span>`;
        return cleanupMock;
      });

      const rootEl = document.createElement("div");
      const instance = mount(rootEl, { title: "My Vanilla App" });

      expect(rootEl.innerHTML).toContain("My Vanilla App");

      instance.update({ title: "Updated Vanilla App" });
      expect(rootEl.innerHTML).toContain("Updated Vanilla App");

      instance.unmount();
      expect(cleanupMock).toHaveBeenCalled();
    });
  });

  describe("createReactMount", () => {
    it("creates a mountable lifecycle contract for React components with update and unmount", () => {
      function SimpleComponent(props) {
        return <span data-testid="react-mount-test">{props.text}</span>;
      }

      const { mount } = createReactMount(SimpleComponent);
      const rootEl = document.createElement("div");
      const instance = mount(rootEl, { text: "Hello React Mount" });

      expect(typeof instance.unmount).toBe("function");
      expect(typeof instance.update).toBe("function");

      instance.update({ text: "Updated React Mount" });
      instance.unmount();
    });
  });

  describe("UniversalRemoteMount", () => {
    it("mounts a universal lifecycle remote ({ mount }) into container DOM", async () => {
      const mockCleanup = vi.fn();
      const mockRemoteModule = {
        mount: (container, props) => {
          container.innerHTML = `<div data-testid="remote-content">${props.greeting}</div>`;
          return mockCleanup;
        },
      };

      const loadRemote = vi.fn().mockResolvedValue(mockRemoteModule);

      const { unmount } = render(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          props={{ greeting: "Greetings from Vue/Svelte remote" }}
          remoteName="MockRemote"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("remote-content")).toBeDefined();
        expect(screen.getByTestId("remote-content").textContent).toBe(
          "Greetings from Vue/Svelte remote"
        );
      });

      unmount();
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it("updates existing mount instance without remounting when props change", async () => {
      const updateMock = vi.fn((props) => {
        const el = document.getElementById("props-display");
        if (el) el.textContent = `Count: ${props.count}`;
      });
      const unmountMock = vi.fn();

      const mockRemoteModule = {
        mount: (container, props) => {
          container.innerHTML = `<div id="props-display">Count: ${props.count}</div>`;
          return {
            update: updateMock,
            unmount: unmountMock,
          };
        },
      };

      const loadRemote = vi.fn().mockResolvedValue(mockRemoteModule);

      const { rerender } = render(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          props={{ count: 1 }}
          remoteName="UpdatingRemote"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Count: 1")).toBeDefined();
      });

      // Rerender with updated props
      rerender(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          props={{ count: 2 }}
          remoteName="UpdatingRemote"
        />
      );

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith({ count: 2 });
      });

      expect(unmountMock).not.toHaveBeenCalled();
    });

    it("mounts a native React component remote directly", async () => {
      function MockReactRemote(props) {
        return <div data-testid="react-remote">React: {props.name}</div>;
      }

      const loadRemote = vi.fn().mockResolvedValue({ default: MockReactRemote });

      render(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          props={{ name: "Billing Micro-App" }}
          remoteName="ReactRemote"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("react-remote")).toBeDefined();
        expect(screen.getByTestId("react-remote").textContent).toBe(
          "React: Billing Micro-App"
        );
      });
    });

    it("displays error fallback when remote loading fails", async () => {
      const loadRemote = vi.fn().mockRejectedValue(new Error("Network chunk failed"));

      render(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          remoteName="FailingRemote"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load FailingRemote: Network chunk failed/)).toBeDefined();
      });
    });

    it("recovers from failed load upon clicking the Retry affordance", async () => {
      let attempt = 0;
      const loadRemote = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          return Promise.reject(new Error("Transient fetch error"));
        }
        return Promise.resolve({
          mount: (container) => {
            container.innerHTML = '<div data-testid="recovered-content">Recovered!</div>';
          },
        });
      });

      render(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          remoteName="RecoverableRemote"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load RecoverableRemote: Transient fetch error/)).toBeDefined();
      });

      // Click the internal Retry button
      const retryBtn = screen.getByRole("button", { name: /retry/i });
      retryBtn.click();

      await waitFor(() => {
        expect(screen.getByTestId("recovered-content")).toBeDefined();
        expect(screen.getByTestId("recovered-content").textContent).toBe("Recovered!");
      });

      expect(loadRemote).toHaveBeenCalledTimes(2);
    });

    it("re-executes remote loader when parent increments retryKey", async () => {
      let attempt = 0;
      const loadRemote = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          return Promise.reject(new Error("Initial load failure"));
        }
        return Promise.resolve({
          mount: (container) => {
            container.innerHTML = '<div data-testid="retry-key-recovered">Retry Key Success</div>';
          },
        });
      });

      const { rerender } = render(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          remoteName="RetryKeyRemote"
          retryKey={0}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load RetryKeyRemote: Initial load failure/)).toBeDefined();
      });

      // Bump retryKey
      rerender(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          remoteName="RetryKeyRemote"
          retryKey={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("retry-key-recovered")).toBeDefined();
      });

      expect(loadRemote).toHaveBeenCalledTimes(2);
    });

    it("calls remoteModule.default.unmount when mount returns nothing and remoteModule is default-exported", async () => {
      const defaultUnmountMock = vi.fn();
      const mockModule = {
        default: {
          mount: vi.fn((container) => {
            container.innerHTML = '<span data-testid="default-mount">Mounted via default</span>';
            // returns nothing (void)
          }),
          unmount: defaultUnmountMock,
        },
      };

      const loadRemote = vi.fn().mockResolvedValue(mockModule);

      const { unmount } = render(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          remoteName="DefaultLifecycleRemote"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("default-mount")).toBeDefined();
      });

      unmount();
      expect(defaultUnmountMock).toHaveBeenCalledTimes(1);
    });

    it("handles React.StrictMode cleanly with double-invocation settling correctly", async () => {
      const mockCleanup = vi.fn();
      const mockRemoteModule = {
        mount: vi.fn((container) => {
          container.innerHTML = '<div data-testid="strict-mode-content">Strict Content</div>';
          return mockCleanup;
        }),
      };

      const loadRemote = vi.fn().mockResolvedValue(mockRemoteModule);

      const { unmount } = render(
        <React.StrictMode>
          <UniversalRemoteMount
            loadRemote={loadRemote}
            remoteName="StrictModeRemote"
          />
        </React.StrictMode>
      );

      await waitFor(() => {
        expect(screen.getByTestId("strict-mode-content")).toBeDefined();
      });

      // StrictMode in development simulates an immediate mount -> unmount -> mount.
      // Now unmount the component completely and verify cleanup was called.
      unmount();
      expect(mockCleanup).toHaveBeenCalled();
    });

    it("forces clean unmount and remount on retryKey change even when loadRemote returns identical cached module object", async () => {
      const mockCleanup = vi.fn();
      const cachedModule = {
        mount: vi.fn((container) => {
          container.innerHTML = '<div data-testid="cached-module-content">Cached Content</div>';
          return mockCleanup;
        }),
      };

      // Always resolves to the exact same module reference (ES module cache simulation)
      const loadRemote = vi.fn().mockResolvedValue(cachedModule);

      const { rerender } = render(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          retryKey={0}
          remoteName="CachedModuleRemote"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("cached-module-content")).toBeDefined();
      });
      expect(cachedModule.mount).toHaveBeenCalledTimes(1);
      expect(mockCleanup).not.toHaveBeenCalled();

      // Bump retryKey — loadRemote resolves to the exact same cachedModule object
      rerender(
        <UniversalRemoteMount
          loadRemote={loadRemote}
          retryKey={1}
          remoteName="CachedModuleRemote"
        />
      );

      await waitFor(() => {
        expect(cachedModule.mount).toHaveBeenCalledTimes(2);
      });
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });
  });
});

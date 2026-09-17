import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { sendMfeEvent, useMfeEventListener, MFE_EVENTS } from "./mfe-events.js";

describe("Cross-MFE Event Bus (mfe-events)", () => {
  beforeEach(() => {
    delete window.__IS_HOST__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendMfeEvent", () => {
    it("dispatches CustomEvent with payload, timestamp, and default remote sender", () => {
      const listener = vi.fn();
      window.addEventListener(MFE_EVENTS.PING, listener);

      sendMfeEvent(MFE_EVENTS.PING, { message: "Ping from remote", count: 1 });

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0];
      expect(event).toBeInstanceOf(CustomEvent);
      expect(event.detail.message).toBe("Ping from remote");
      expect(event.detail.count).toBe(1);
      expect(event.detail.sender).toBe("Remote Micro-Frontend");
      expect(typeof event.detail.timestamp).toBe("number");

      window.removeEventListener(MFE_EVENTS.PING, listener);
    });

    it("correctly identifies Host sender when window.__IS_HOST__ is true", () => {
      window.__IS_HOST__ = true;

      const listener = vi.fn();
      window.addEventListener(MFE_EVENTS.PONG, listener);

      sendMfeEvent(MFE_EVENTS.PONG, { message: "Pong from host" });

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0];
      expect(event.detail.sender).toBe("Host Shell");

      window.removeEventListener(MFE_EVENTS.PONG, listener);
    });

    it("respects window.__MFE_NAME__ and explicit payload.sender overrides", () => {
      window.__MFE_NAME__ = "customRemote";

      const listener = vi.fn();
      window.addEventListener(MFE_EVENTS.PING, listener);

      sendMfeEvent(MFE_EVENTS.PING, { message: "Test" });
      expect(listener.mock.calls[0][0].detail.sender).toBe("customRemote");

      sendMfeEvent(MFE_EVENTS.PING, { message: "Override", sender: "explicitSender" });
      expect(listener.mock.calls[1][0].detail.sender).toBe("explicitSender");

      delete window.__MFE_NAME__;
      window.removeEventListener(MFE_EVENTS.PING, listener);
    });
  });

  describe("useMfeEventListener Hook Lifecycle", () => {
    it("attaches listener on mount and receives dispatched events", () => {
      const handler = vi.fn();

      renderHook(() => useMfeEventListener(MFE_EVENTS.PING, handler));

      act(() => {
        sendMfeEvent(MFE_EVENTS.PING, { data: "test-data" });
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ data: "test-data" })
      );
    });

    it("does not trigger callback for unrelated event names", () => {
      const handler = vi.fn();

      renderHook(() => useMfeEventListener(MFE_EVENTS.PONG, handler));

      act(() => {
        sendMfeEvent(MFE_EVENTS.PING, { data: "ping-only" });
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("cleans up event listener on unmount to prevent memory leaks", () => {
      const handler = vi.fn();
      const removeSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() =>
        useMfeEventListener(MFE_EVENTS.NOTIFICATION, handler)
      );

      // Verify listener works while mounted
      act(() => {
        sendMfeEvent(MFE_EVENTS.NOTIFICATION, { id: 1 });
      });
      expect(handler).toHaveBeenCalledTimes(1);

      // Unmount hook
      unmount();

      expect(removeSpy).toHaveBeenCalledWith(
        MFE_EVENTS.NOTIFICATION,
        expect.any(Function)
      );

      // Dispatch event after unmount
      act(() => {
        sendMfeEvent(MFE_EVENTS.NOTIFICATION, { id: 2 });
      });

      // Handler should NOT be called again
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("does not re-register event listener when re-rendered with a new inline handler function", () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      const removeSpy = vi.spyOn(window, "removeEventListener");

      let latestMessage = "";
      const { rerender } = renderHook(
        ({ onMsg }) => useMfeEventListener(MFE_EVENTS.PING, onMsg),
        {
          initialProps: {
            onMsg: (detail) => {
              latestMessage = `v1: ${detail.message}`;
            },
          },
        }
      );

      expect(addSpy).toHaveBeenCalledWith(MFE_EVENTS.PING, expect.any(Function));
      const addCallsBefore = addSpy.mock.calls.filter(([evt]) => evt === MFE_EVENTS.PING).length;
      const removeCallsBefore = removeSpy.mock.calls.filter(([evt]) => evt === MFE_EVENTS.PING).length;

      // Re-render with a fresh inline arrow function
      rerender({
        onMsg: (detail) => {
          latestMessage = `v2: ${detail.message}`;
        },
      });

      const addCallsAfter = addSpy.mock.calls.filter(([evt]) => evt === MFE_EVENTS.PING).length;
      const removeCallsAfter = removeSpy.mock.calls.filter(([evt]) => evt === MFE_EVENTS.PING).length;

      // Listener MUST NOT have been re-subscribed or removed
      expect(addCallsAfter).toBe(addCallsBefore);
      expect(removeCallsAfter).toBe(removeCallsBefore);

      // Firing the event must invoke the latest handler (v2)
      act(() => {
        sendMfeEvent(MFE_EVENTS.PING, { message: "ref-check" });
      });

      expect(latestMessage).toBe("v2: ref-check");
    });

    it("supports newly standardized CART_UPDATE and ORDER_PLACED events", () => {
      expect(MFE_EVENTS.CART_UPDATE).toBe("mfe:cart_update");
      expect(MFE_EVENTS.ORDER_PLACED).toBe("mfe:order_placed");

      const cartHandler = vi.fn();
      const orderHandler = vi.fn();

      const unsubCart = renderHook(() =>
        useMfeEventListener(MFE_EVENTS.CART_UPDATE, cartHandler)
      );
      const unsubOrder = renderHook(() =>
        useMfeEventListener(MFE_EVENTS.ORDER_PLACED, orderHandler)
      );

      act(() => {
        sendMfeEvent(MFE_EVENTS.CART_UPDATE, { count: 3 });
        sendMfeEvent(MFE_EVENTS.ORDER_PLACED, { orderId: "ORD-99" });
      });

      expect(cartHandler).toHaveBeenCalledWith(
        expect.objectContaining({ count: 3 })
      );
      expect(orderHandler).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: "ORD-99" })
      );

      unsubCart.unmount();
      unsubOrder.unmount();
    });
  });
});

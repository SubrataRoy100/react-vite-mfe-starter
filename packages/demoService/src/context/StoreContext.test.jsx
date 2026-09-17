import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { StoreProvider, useStore } from "./StoreContext.jsx";
import { PRODUCTS } from "../data/products.js";
import { MFE_EVENTS } from "@subrataroy100/mfe-shared";

describe("StoreContext", () => {
  it("initializes with default cart and currency", () => {
    const wrapper = ({ children }) => <StoreProvider>{children}</StoreProvider>;
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current.cart.length).toBeGreaterThan(0);
    expect(result.current.currency).toBe("USD");
    expect(result.current.totalCartCount).toBe(1);
    expect(result.current.formatPrice(100)).toBe("$100.00");
  });

  it("adds items to cart and updates count and total", () => {
    const wrapper = ({ children }) => <StoreProvider>{children}</StoreProvider>;
    const { result } = renderHook(() => useStore(), { wrapper });

    act(() => {
      result.current.addToCart(PRODUCTS[1]);
    });

    expect(result.current.totalCartCount).toBe(2);
    expect(result.current.cart.some((i) => i.product.id === PRODUCTS[1].id)).toBe(true);
  });

  it("updates quantity and removes item when quantity reaches 0", () => {
    const wrapper = ({ children }) => <StoreProvider>{children}</StoreProvider>;
    const { result } = renderHook(() => useStore(), { wrapper });

    const initialItem = result.current.cart[0];

    act(() => {
      result.current.updateQuantity(initialItem.product.id, -1);
    });

    expect(result.current.cart.find((i) => i.product.id === initialItem.product.id)).toBeUndefined();
    expect(result.current.totalCartCount).toBe(0);
  });

  it("converts currency when currency changes", () => {
    const wrapper = ({ children }) => <StoreProvider>{children}</StoreProvider>;
    const { result } = renderHook(() => useStore(), { wrapper });

    act(() => {
      result.current.setCurrency("EUR");
    });

    expect(result.current.currency).toBe("EUR");
    expect(result.current.formatPrice(100)).toBe("€92.00");
  });

  it("clears cart silently when silent option is passed", () => {
    const listener = vi.fn();
    window.addEventListener(MFE_EVENTS.NOTIFICATION, listener);

    const wrapper = ({ children }) => <StoreProvider>{children}</StoreProvider>;
    const { result } = renderHook(() => useStore(), { wrapper });

    act(() => {
      result.current.clearCart(true);
    });

    expect(result.current.totalCartCount).toBe(0);
    // Notification event should NOT be called when silent = true
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener(MFE_EVENTS.NOTIFICATION, listener);
  });

  it("fires notification when clearCart is called non-silently", () => {
    const listener = vi.fn();
    window.addEventListener(MFE_EVENTS.NOTIFICATION, listener);

    const wrapper = ({ children }) => <StoreProvider>{children}</StoreProvider>;
    const { result } = renderHook(() => useStore(), { wrapper });

    act(() => {
      result.current.clearCart(false);
    });

    expect(result.current.totalCartCount).toBe(0);
    expect(listener).toHaveBeenCalled();

    window.removeEventListener(MFE_EVENTS.NOTIFICATION, listener);
  });
});

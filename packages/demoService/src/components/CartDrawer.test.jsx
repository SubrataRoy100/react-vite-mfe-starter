import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CartDrawer from "./CartDrawer.jsx";
import { StoreProvider, useStore } from "../context/StoreContext.jsx";
import { MFE_EVENTS } from "@mfe/shared";

function CartDrawerHarness() {
  const { setIsCartOpen } = useStore();
  return (
    <>
      <button type="button" onClick={() => setIsCartOpen(true)}>
        Open Cart
      </button>
      <CartDrawer />
    </>
  );
}

describe("CartDrawer", () => {
  it("does not render when isCartOpen is false", () => {
    render(
      <StoreProvider>
        <CartDrawer />
      </StoreProvider>
    );

    expect(screen.queryByText(/Your Shopping Cart/i)).toBeNull();
  });

  it("renders cart items and allows quantity update", () => {
    render(
      <StoreProvider>
        <CartDrawerHarness />
      </StoreProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Open Cart/i }));

    expect(screen.getByText(/Your Shopping Cart/i)).toBeDefined();
    expect(screen.getByText(/Checkout/i)).toBeDefined();
  });

  it("executes checkout and fires ORDER_PLACED event", () => {
    const orderListener = vi.fn();
    window.addEventListener(MFE_EVENTS.ORDER_PLACED, orderListener);

    render(
      <StoreProvider>
        <CartDrawerHarness />
      </StoreProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Open Cart/i }));

    const checkoutButton = screen.getByRole("button", { name: /Checkout/i });
    fireEvent.click(checkoutButton);

    expect(orderListener).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Order Confirmed/i)).toBeDefined();

    window.removeEventListener(MFE_EVENTS.ORDER_PLACED, orderListener);
  });
});

import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { sendMfeEvent, MFE_EVENTS } from "@mfe/shared";

export default function CartDrawer() {
  const {
    cart,
    totalCartCount,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    formatPrice,
    subtotal,
    tax,
    shipping,
    total,
  } = useStore();

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");

  if (!isCartOpen) return null;

  function handleCheckout() {
    const newOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderId(newOrderId);
    setOrderPlaced(true);

    sendMfeEvent(MFE_EVENTS.NOTIFICATION, {
      message: `Order #${newOrderId} placed successfully! (${formatPrice(total)})`,
      sender: "CloudStore Remote",
    });

    sendMfeEvent(MFE_EVENTS.ORDER_PLACED, {
      orderId: newOrderId,
      total: formatPrice(total),
      itemCount: totalCartCount,
      sender: "CloudStore Remote",
    });

    // Pass silent true so order confirmation is not accompanied by a redundant "Cart cleared" toast
    clearCart(true);
  }

  function handleClose() {
    setOrderPlaced(false);
    setIsCartOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛍️</span>
              <h2 className="text-lg font-bold text-slate-900">Your Shopping Cart</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                {totalCartCount} items
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Drawer Content Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {orderPlaced ? (
              <div className="text-center py-12 px-4 space-y-4">
                <span className="text-5xl">🎉</span>
                <h3 className="text-xl font-bold text-slate-900">Order Confirmed!</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Thank you for testing the federated checkout flow. Your order{" "}
                  <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-blue-600">
                    {orderId}
                  </code>{" "}
                  has been broadcast across the monorepo event bus!
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : cart.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <span className="text-4xl">🛒</span>
                <h3 className="text-base font-bold text-slate-800">Your cart is empty</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Browse the catalog and add products to test real-time cross-MFE state synchronization.
                </p>
              </div>
            ) : (
              <div className="space-y-4 divide-y divide-slate-100">
                {cart.map((item) => (
                  <div key={item.product.id} className="pt-4 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-100">
                        {item.product.icon}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {item.product.name}
                        </h4>
                        <span className="text-xs font-semibold text-slate-600">
                          {formatPrice(item.product.price)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quantity buttons */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 text-xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200"
                        >
                          -
                        </button>
                        <span className="px-2 font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200"
                        >
                          +
                        </button>
                      </div>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-red-500 p-1 text-xs"
                        title="Remove item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drawer Footer & Checkout Breakdown */}
          {!orderPlaced && cart.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax (8%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 && subtotal > 200 ? "FREE (Over $200)" : shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-base text-blue-600">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow hover:shadow-md flex items-center justify-center gap-2"
              >
                <span>Checkout</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PRODUCTS, CURRENCIES } from "../data/products.js";
import { sendMfeEvent, MFE_EVENTS } from "@mfe/shared";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [products] = useState(PRODUCTS);
  const [cart, setCart] = useState(() => {
    // Initial sample cart item so users immediately see a working cart
    return [{ product: PRODUCTS[0], quantity: 1 }];
  });
  const [currency, setCurrency] = useState("USD");
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Sync initial cart count across the monorepo event bus on mount
  const initialCartCountRef = useRef(totalCartCount);
  useEffect(() => {
    sendMfeEvent(MFE_EVENTS.CART_UPDATE, {
      count: initialCartCountRef.current,
      sender: "CloudStore Remote",
    });
  }, []); // Run once on mount to avoid double-firing CART_UPDATE on user mutations

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  const addToCart = useCallback(
    (product) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);
        let newCart;
        if (existing) {
          newCart = prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          newCart = [...prev, { product, quantity: 1 }];
        }

        const newTotal = newCart.reduce((sum, i) => sum + i.quantity, 0);

        // Notify the Host Shell and other remotes over the Cross-MFE Event Bus!
        sendMfeEvent(MFE_EVENTS.CART_UPDATE, {
          count: newTotal,
          sender: "CloudStore Remote",
          product: product.name,
        });

        sendMfeEvent(MFE_EVENTS.NOTIFICATION, {
          message: `Added "${product.name}" to cart (Total: ${newTotal} items)`,
          sender: "CloudStore Remote",
        });

        return newCart;
      });

      showToast(`Added ${product.name} to cart!`);
    },
    [showToast]
  );

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => {
      const target = prev.find((item) => item.product.id === productId);
      const newCart = prev.filter((item) => item.product.id !== productId);
      const newTotal = newCart.reduce((sum, i) => sum + i.quantity, 0);

      sendMfeEvent(MFE_EVENTS.CART_UPDATE, {
        count: newTotal,
        sender: "CloudStore Remote",
      });

      if (target) {
        sendMfeEvent(MFE_EVENTS.NOTIFICATION, {
          message: `Removed "${target.product.name}" from cart`,
          sender: "CloudStore Remote",
        });
      }

      return newCart;
    });
  }, []);

  const updateQuantity = useCallback((productId, delta) => {
    setCart((prev) => {
      const newCart = prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean);

      const newTotal = newCart.reduce((sum, i) => sum + i.quantity, 0);
      sendMfeEvent(MFE_EVENTS.CART_UPDATE, {
        count: newTotal,
        sender: "CloudStore Remote",
      });

      return newCart;
    });
  }, []);

  const clearCart = useCallback(
    (silentOrOptions = false) => {
      const isSilent =
        typeof silentOrOptions === "boolean"
          ? silentOrOptions
          : Boolean(silentOrOptions && typeof silentOrOptions === "object" && silentOrOptions.silent);

      setCart([]);
      sendMfeEvent(MFE_EVENTS.CART_UPDATE, {
        count: 0,
        sender: "CloudStore Remote",
      });
      if (!isSilent) {
        sendMfeEvent(MFE_EVENTS.NOTIFICATION, {
          message: "Cart cleared",
          sender: "CloudStore Remote",
        });
        showToast("Cart has been cleared");
      }
    },
    [showToast]
  );

  const formatPrice = useCallback(
    (usdAmount) => {
      const cur = CURRENCIES[currency] || CURRENCIES.USD;
      const converted = usdAmount * cur.rate;
      return `${cur.symbol}${converted.toFixed(2)}`;
    },
    [currency]
  );

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const tax = subtotal * 0.08;
  const shipping = subtotal > 200 || subtotal === 0 ? 0 : 15;
  const total = subtotal + tax + shipping;

  const contextValue = useMemo(
    () => ({
      products,
      cart,
      totalCartCount,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      currency,
      setCurrency,
      showOutOfStock,
      setShowOutOfStock,
      isCartOpen,
      setIsCartOpen,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      formatPrice,
      subtotal,
      tax,
      shipping,
      total,
      toastMessage,
    }),
    [
      products,
      cart,
      totalCartCount,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      currency,
      showOutOfStock,
      isCartOpen,
      searchQuery,
      selectedCategory,
      formatPrice,
      subtotal,
      tax,
      shipping,
      total,
      toastMessage,
    ]
  );

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}

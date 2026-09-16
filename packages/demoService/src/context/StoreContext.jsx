/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
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

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Sync initial cart count across the monorepo event bus
  useEffect(() => {
    sendMfeEvent("mfe:cart_update", {
      count: totalCartCount,
      sender: "CloudStore Remote",
    });
  }, [totalCartCount]);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }

  function addToCart(product) {
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
      sendMfeEvent("mfe:cart_update", {
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
  }

  function removeFromCart(productId) {
    setCart((prev) => {
      const target = prev.find((item) => item.product.id === productId);
      const newCart = prev.filter((item) => item.product.id !== productId);
      const newTotal = newCart.reduce((sum, i) => sum + i.quantity, 0);

      sendMfeEvent("mfe:cart_update", {
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
  }

  function updateQuantity(productId, delta) {
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
      sendMfeEvent("mfe:cart_update", {
        count: newTotal,
        sender: "CloudStore Remote",
      });

      return newCart;
    });
  }

  function clearCart() {
    setCart([]);
    sendMfeEvent("mfe:cart_update", {
      count: 0,
      sender: "CloudStore Remote",
    });
    sendMfeEvent(MFE_EVENTS.NOTIFICATION, {
      message: "Cart cleared",
      sender: "CloudStore Remote",
    });
    showToast("Cart has been cleared");
  }

  function formatPrice(usdAmount) {
    const cur = CURRENCIES[currency] || CURRENCIES.USD;
    const converted = usdAmount * cur.rate;
    return `${cur.symbol}${converted.toFixed(2)}`;
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const tax = subtotal * 0.08;
  const shipping = subtotal > 200 || subtotal === 0 ? 0 : 15;
  const total = subtotal + tax + shipping;

  return (
    <StoreContext.Provider
      value={{
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
      }}
    >
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

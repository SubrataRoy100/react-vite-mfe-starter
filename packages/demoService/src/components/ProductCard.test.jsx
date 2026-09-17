import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductCard from "./ProductCard.jsx";
import { StoreProvider } from "../context/StoreContext.jsx";
import { PRODUCTS } from "../data/products.js";

describe("ProductCard", () => {
  it("renders product name, price, and category badge", () => {
    const product = PRODUCTS[0];
    render(
      <StoreProvider>
        <ProductCard product={product} />
      </StoreProvider>
    );

    expect(screen.getByText(product.name)).toBeDefined();
    expect(screen.getByText(`$${product.price}.00`)).toBeDefined();
    expect(screen.getByText(product.category)).toBeDefined();
  });

  it("triggers add to cart when Add to Cart button is clicked", () => {
    const product = PRODUCTS[0];
    render(
      <StoreProvider>
        <ProductCard product={product} />
      </StoreProvider>
    );

    const button = screen.getByRole("button", { name: /Add to Cart/i });
    fireEvent.click(button);

    // Instant button feedback changes text to "✓ Added"
    expect(screen.getByText(/Added/i)).toBeDefined();
  });

  it("disables button when product stock is 0", () => {
    const outOfStockProduct = PRODUCTS.find((p) => p.stock === 0) || {
      id: "test-zero",
      name: "Sold Out Item",
      category: "Hardware",
      price: 99,
      stock: 0,
      description: "None left",
    };

    render(
      <StoreProvider>
        <ProductCard product={outOfStockProduct} />
      </StoreProvider>
    );

    const button = screen.getByRole("button", { name: /Out of Stock/i });
    expect(button.getAttribute("disabled")).not.toBeNull();
  });
});

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "./Button.jsx";

describe("Button component", () => {
  it("renders with default primary variant styling", () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole("button", { name: /Click Me/i });
    expect(button.textContent).toBe("Click Me");
    expect(button.className).toContain("bg-blue-600");
  });

  it("renders secondary and danger variants correctly", () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button").className).toContain("bg-slate-200");

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole("button").className).toContain("bg-rose-600");
  });

  it("handles onClick callbacks on user interaction", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Action</Button>);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

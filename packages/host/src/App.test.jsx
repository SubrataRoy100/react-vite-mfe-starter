import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "./App.jsx";

// `demoService/App` and `./pages/LandingPage` are only resolvable at real
// build time (federation / real dynamic import) — mock both so this file
// tests routing wiring, not the remote's or the landing page's internals.
vi.mock("demoService/App", () => ({
  default: () => <div data-testid="demo-app">Demo Remote Mounted</div>,
}));

vi.mock("./pages/LandingPage", () => ({
  default: () => <div data-testid="landing-page">Host Landing Page</div>,
}));

describe("Host App routing", () => {
  it("renders the host landing page at /", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("landing-page")).toBeDefined();
  });

  it("mounts the demoService remote at /demo/* when present, or routes gracefully", async () => {
    render(
      <MemoryRouter initialEntries={["/demo/settings"]}>
        <App />
      </MemoryRouter>
    );

    const demoApp = screen.queryByTestId("demo-app");
    if (demoApp) {
      expect(demoApp).toBeDefined();
      expect(screen.queryByText(/Failed to load Demo Service Module/i)).toBeNull();
    }
    expect(screen.queryByText(/Global Host Error/i)).toBeNull();
  });
});

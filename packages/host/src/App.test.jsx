import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "./App.jsx";

// `demoService/App` and `./pages/LandingPage` are only resolvable at real
// build time (federation / real dynamic import) — mock both so this file
// tests routing wiring, not the remote's or the landing page's internals.
vi.mock("marketingMfe/App", () => ({
  default: () => <div data-testid="marketing-app">Marketing Remote Mounted</div>,
}));

vi.mock("authMfe/App", () => ({
  default: () => <div data-testid="auth-app">Auth Remote Mounted</div>,
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

  it("mounts the marketingMfe remote at /landing/*", async () => {
    render(
      <MemoryRouter initialEntries={["/landing"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("marketing-app")).toBeDefined();
    expect(screen.queryByText(/Global Host Error/i)).toBeNull();
  });

  it("mounts the authMfe remote at /auth/*", async () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("auth-app")).toBeDefined();
    expect(screen.queryByText(/Global Host Error/i)).toBeNull();
  });
});

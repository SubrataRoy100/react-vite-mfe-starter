import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "./App.jsx";

// Mock LandingPage
vi.mock("./pages/LandingPage", () => ({
  default: () => <div data-testid="landing-page">Host Landing Page</div>,
}));

// Mock remotesRegistry with a testable active remote route and a crashing remote route
vi.mock("./remotesRegistry.jsx", () => {
  const HealthyRemote = () => <div data-testid="healthy-remote">Healthy Remote App</div>;
  const CrashingRemote = () => {
    throw new Error("Simulated remote crash exception");
  };

  return {
    remoteRoutes: [
      {
        key: "authMfe-auth",
        name: "authMfe",
        path: "/auth/*",
        urlPath: "/auth",
        port: 5002,
        Component: HealthyRemote,
        framework: "react",
      },
      {
        key: "crashMfe-crash",
        name: "crashMfe",
        path: "/crash/*",
        urlPath: "/crash",
        port: 5099,
        Component: CrashingRemote,
        framework: "react",
      },
    ],
  };
});

describe("Host App routing and isolation", () => {
  it("renders the host landing page at / when no root remote is declared", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("landing-page")).toBeDefined();
  });

  it("mounts registered remote application at its designated subpath", async () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("healthy-remote")).toBeDefined();
  });

  it("isolates runtime errors in remotes using RemoteErrorBoundary without crashing the host shell", async () => {
    // Suppress console.error in test output for the intentional test crash
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={["/crash"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Failed to load crashMfe/i)).toBeDefined();
    expect(screen.getByText(/MFE Boundary Isolated/i)).toBeDefined();
    expect(screen.getByText(/Simulated remote crash exception/i)).toBeDefined();

    spy.mockRestore();
  });

  it("renders nothing for unregistered routes", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/unregistered-domain-route"]}>
        <App />
      </MemoryRouter>
    );

    expect(container.textContent).toBe("");
  });
});

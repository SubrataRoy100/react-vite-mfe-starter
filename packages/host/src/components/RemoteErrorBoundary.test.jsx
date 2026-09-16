import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import RemoteErrorBoundary from "./RemoteErrorBoundary.jsx";

// Fault-injecting test component
function FaultyComponent({ shouldThrow, errorMessage = "Simulated Remote Crash!" }) {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="healthy-child">Remote Micro-App Active</div>;
}

// Wrapper component to test retry and recovery
function RecoverableHarness() {
  const [hasError, setHasError] = useState(true);

  return (
    <RemoteErrorBoundary
      remoteName="Test Billing Service"
      onReset={() => setHasError(false)}
    >
      <FaultyComponent shouldThrow={hasError} errorMessage="Network Fetch Failed" />
    </RemoteErrorBoundary>
  );
}

describe("RemoteErrorBoundary", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Suppress expected React error logs during deliberate error throwing
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  it("renders children normally when no exception is thrown", () => {
    render(
      <RemoteErrorBoundary remoteName="Demo Service">
        <FaultyComponent shouldThrow={false} />
      </RemoteErrorBoundary>
    );

    const healthyNode = screen.getByTestId("healthy-child");
    expect(healthyNode.textContent).toBe("Remote Micro-App Active");
    expect(screen.queryByText(/Failed to load Demo Service/i)).toBeNull();
  });

  it("catches fatal child errors and renders the isolated fallback card", () => {
    render(
      <RemoteErrorBoundary remoteName="Analytics Dashboard">
        <FaultyComponent shouldThrow={true} errorMessage="ChunkLoadError: 404 remoteEntry" />
      </RemoteErrorBoundary>
    );

    // Verify fallback title includes remoteName
    expect(screen.getByText("Failed to load Analytics Dashboard")).toBeDefined();

    // Verify isolation badge
    expect(screen.getByText("MFE Boundary Isolated")).toBeDefined();

    // Verify error message is displayed
    expect(screen.getByText("ChunkLoadError: 404 remoteEntry")).toBeDefined();

    // Verify retry button is rendered
    expect(screen.getByRole("button", { name: /Retry Component/i })).toBeDefined();
  });

  it("re-renders child successfully when Retry button is clicked after recovery", () => {
    render(<RecoverableHarness />);

    // Initially crashed
    expect(screen.getByText("Failed to load Test Billing Service")).toBeDefined();
    expect(screen.getByText("Network Fetch Failed")).toBeDefined();

    // Click retry
    const retryButton = screen.getByRole("button", { name: /Retry Component/i });
    fireEvent.click(retryButton);

    // Component recovers and renders healthy child
    const healthyNode = screen.getByTestId("healthy-child");
    expect(healthyNode.textContent).toBe("Remote Micro-App Active");
    expect(screen.queryByText("Failed to load Test Billing Service")).toBeNull();
  });
});

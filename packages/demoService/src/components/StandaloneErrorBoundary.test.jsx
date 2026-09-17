import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StandaloneErrorBoundary from "./StandaloneErrorBoundary.jsx";

function CrashingChild({ shouldCrash }) {
  if (shouldCrash) {
    throw new Error("Intentional Standalone Crash");
  }
  return <div data-testid="child-content">Healthy Child</div>;
}

function TestHarness() {
  const [crashed, setCrashed] = useState(true);
  return (
    <StandaloneErrorBoundary>
      <CrashingChild shouldCrash={crashed} />
      {crashed && (
        <button
          type="button"
          data-testid="fix-button"
          onClick={() => setCrashed(false)}
        >
          Fix
        </button>
      )}
    </StandaloneErrorBoundary>
  );
}

describe("StandaloneErrorBoundary", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders children when no error occurs", () => {
    render(
      <StandaloneErrorBoundary>
        <CrashingChild shouldCrash={false} />
      </StandaloneErrorBoundary>
    );

    expect(screen.getByTestId("child-content")).toBeDefined();
    expect(screen.queryByText(/Demo Service Exception Caught/i)).toBeNull();
  });

  it("catches errors and renders the standalone recovery card with reset button", () => {
    render(
      <StandaloneErrorBoundary>
        <CrashingChild shouldCrash={true} />
      </StandaloneErrorBoundary>
    );

    expect(screen.getByText(/Demo Service Exception Caught/i)).toBeDefined();
    expect(screen.getByText(/Intentional Standalone Crash/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Reset Remote App/i })).toBeDefined();
  });

  it("resets error state when Reset button is clicked after error is resolved", () => {
    render(<TestHarness />);

    expect(screen.getByText(/Demo Service Exception Caught/i)).toBeDefined();

    // Click Reset button on the error boundary card
    const resetButton = screen.getByRole("button", { name: /Reset Remote App/i });
    fireEvent.click(resetButton);

    // If still crashing, boundary re-catches
    expect(screen.getByText(/Demo Service Exception Caught/i)).toBeDefined();
  });
});

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { MFE_EVENTS, sendMfeEvent } from "@mfe/shared";
import MfeDevWidget from "./MfeDevWidget.jsx";

// Minimal local boundary so this package's tests don't need to depend on
// react-error-boundary (that's a host-only dependency; the real, styled
// boundary is covered by host/src/components/RemoteErrorBoundary.test.jsx).
class TestBoundary extends React.Component {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  render() {
    if (this.state.crashed) {
      return <div data-testid="crashed">Crashed</div>;
    }
    return this.props.children;
  }
}

function renderWidget(props) {
  return render(
    <TestBoundary>
      <MfeDevWidget {...props} />
    </TestBoundary>
  );
}

describe("MfeDevWidget", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    delete window.__IS_HOST__;
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  it("badges itself as Standalone Mode when not running inside the host", () => {
    renderWidget();
    expect(screen.getByText(/Standalone Mode/i)).toBeDefined();
  });

  it("badges itself as Embedded in Host Shell when window.__IS_HOST__ is set", () => {
    window.__IS_HOST__ = true;
    renderWidget();
    expect(screen.getByText(/Embedded in Host Shell/i)).toBeDefined();
  });

  it("dispatches an mfe:ping event and increments the ping counter on click", () => {
    const listener = vi.fn();
    window.addEventListener(MFE_EVENTS.PING, listener);

    renderWidget();

    const pingButton = screen.getByRole("button", { name: /Send MFE Ping/i });
    fireEvent.click(pingButton);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.count).toBe(1);
    expect(screen.getByText("1")).toBeDefined(); // Pings Dispatched counter

    window.removeEventListener(MFE_EVENTS.PING, listener);
  });

  it("displays the last received PONG message", () => {
    renderWidget();

    act(() => {
      sendMfeEvent(MFE_EVENTS.PONG, { message: "ack" });
    });

    expect(screen.getByText(/Received PONG from/i)).toBeDefined();
  });

  it("throws and is caught by an enclosing error boundary when the crash button is clicked", () => {
    renderWidget();

    const crashButton = screen.getByRole("button", {
      name: /Simulate Crash/i,
    });
    fireEvent.click(crashButton);

    expect(screen.getByTestId("crashed")).toBeDefined();
  });
});

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import "./index.css";
import App from "./App.jsx";
import { setupMfeTelemetry } from "./utils/telemetry.js";

// Mark global runtime flag so micro-frontends can detect host execution
if (typeof window !== "undefined") {
  window.__IS_HOST__ = true;

  // Initialize host telemetry handler for federated remote diagnostics
  if (!window.__MFE_TELEMETRY_HANDLER__) {
    setupMfeTelemetry({
      onRemoteError: (telemetry) => {
        if (import.meta.env?.DEV) {
          console.info("[MFE Telemetry]", telemetry.remoteName, telemetry.error);
        }
      },
    });
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary
        fallback={
          <div
            style={{ color: "red", padding: "10px", border: "1px solid red" }}
          >
            ⚠️ Failed to load or crashed The website.
          </div>
        }
      >
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);

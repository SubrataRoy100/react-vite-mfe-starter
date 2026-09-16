import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import "./index.css";
import App from "./App.jsx";

// Mark global runtime flag so micro-frontends can detect host execution
if (typeof window !== "undefined") {
  window.__IS_HOST__ = true;
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

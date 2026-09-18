import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import StandaloneErrorBoundary from "./components/StandaloneErrorBoundary.jsx";
import { BrowserRouter } from "react-router";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StandaloneErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StandaloneErrorBoundary>
  </StrictMode>
);

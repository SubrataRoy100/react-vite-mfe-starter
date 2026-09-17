import React from "react";
import { Route, Routes } from "react-router";
import { StoreProvider } from "./context/StoreContext.jsx";

const LandingPage = React.lazy(() => import("./pages/DemoLandingPage"));
const DemoSettingsPage = React.lazy(() => import("./pages/DemoSettingsPage.jsx"));

export default function App() {
  return (
    <StoreProvider>
      <div className="mfe-remote-root mfe-demo-service">
        <React.Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Loading page view...</div>}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/settings" element={<DemoSettingsPage />} />
          </Routes>
        </React.Suspense>
      </div>
    </StoreProvider>
  );
}


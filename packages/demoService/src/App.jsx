import React from "react";
import { Route, Routes } from "react-router";
const LandingPage = React.lazy(() => import("./pages/DemoLandingPage"));
const DemoSettingsPage = React.lazy(() => import("./pages/DemoSettingsPage.jsx"));
export default function App() {
  return (
    <div className="mfe-remote-root mfe-demo-service">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/settings" element={<DemoSettingsPage />} />
      </Routes>
    </div>
  );
}

import React from "react";
import { Route, Routes } from "react-router";
import LoadingFallback from "./components/LoadingFallback";

import Navbar from "./components/Navbar";
import RetriableRemote from "./components/RetriableRemote";
import { sendMfeEvent, MFE_EVENTS } from "@mfe/shared";
import { useMfeEventListener } from "@mfe/shared/adapters";

const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const loadDemoServiceApp = () => import("demoService/App");

function App() {
  // Global Host Shell automated responder for Cross-MFE Pings across all routes (/, /demo, etc.)
  useMfeEventListener(MFE_EVENTS.PING, (detail) => {
    sendMfeEvent(MFE_EVENTS.PONG, {
      message: "Host received your ping successfully!",
      pingSender: detail?.sender,
      timestamp: Date.now(),
    });
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Routes>
          {/* Main host home landing route */}
          <Route
            path="/"
            element={
              <React.Suspense fallback={<LoadingFallback message="Loading Host Shell..." />}>
                <LandingPage />
              </React.Suspense>
            }
          />

          {/* Wildcard allows the remote service to handle its own inner pages */}
          <Route
            path="/demo/*"
            element={
              <RetriableRemote
                loader={loadDemoServiceApp}
                remoteName="Demo Service Module"
                serviceName="demoService"
                fallbackMessage="Streaming Demo Service Micro-Frontend..."
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;

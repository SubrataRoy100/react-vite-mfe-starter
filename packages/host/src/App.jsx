import React from "react";
import { Route, Routes } from "react-router";
import RemoteErrorBoundary from "./components/RemoteErrorBoundary";
import LoadingFallback from "./components/LoadingFallback";

// Lazily pull your remote demo service module over the network
const DemoApp = React.lazy(() => import("demoService/App"));
const LandingPage = React.lazy(() => import("./pages/LandingPage"));

function App() {
  return (
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
          <RemoteErrorBoundary remoteName="Demo Service Module">
            <React.Suspense fallback={<LoadingFallback message="Streaming Demo Service Micro-Frontend..." />}>
              <DemoApp />
            </React.Suspense>
          </RemoteErrorBoundary>
        }
      />
    </Routes>
  );
}

export default App;

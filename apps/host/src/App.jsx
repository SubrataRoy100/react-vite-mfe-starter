import React from "react";
import { Route, Routes } from "react-router";
import LoadingFallback from "./components/LoadingFallback";
import RemoteErrorBoundary from "./components/RemoteErrorBoundary";

import { remoteRoutes } from "./remotesRegistry.jsx";

const LandingPage = React.lazy(() => import("./pages/LandingPage"));

function App() {
  const hasRootRemote = remoteRoutes.some((r) => r.path === "/");

  return (
    <Routes>
      {/* Host portal landing route (active when no remote is registered at root "/") */}
      {!hasRootRemote && (
        <Route
          path="/"
          element={
            <React.Suspense
              fallback={<LoadingFallback message="Loading Host Shell..." />}
            >
              <LandingPage />
            </React.Suspense>
          }
        />
      )}

      {/* Manifest-Driven Dynamic Remote Routes */}
      {remoteRoutes.map(({ key, name, path, Component }) => (
        <Route
          key={key || `${name}-${path}`}
          path={path}
          element={
            <RemoteErrorBoundary remoteName={name}>
              <React.Suspense
                fallback={<LoadingFallback message={`Loading ${name}...`} />}
              >
                <Component />
              </React.Suspense>
            </RemoteErrorBoundary>
          }
        />
      ))}
    </Routes>
  );
}

export default App;

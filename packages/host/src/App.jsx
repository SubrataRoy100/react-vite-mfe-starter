import React from "react";
import { Route, Routes } from "react-router";
import LoadingFallback from "./components/LoadingFallback";
import RemoteErrorBoundary from "./components/RemoteErrorBoundary";

const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const MarketingMfeApp = React.lazy(() => import("marketingMfe/App"));
const AuthMfeApp = React.lazy(() => import("authMfe/App"));
function App() {
  return (
    <Routes>
      {/* Main host home landing route */}
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
      <Route
        path="/landing/*"
        element={
          <RemoteErrorBoundary remoteName="Marketing">
            <React.Suspense
              fallback={<LoadingFallback message="Loading Landing Page...." />}
            >
              <MarketingMfeApp />
            </React.Suspense>
          </RemoteErrorBoundary>
        }
      />
      <Route
        path="/auth/*"
        element={
          <RemoteErrorBoundary remoteName="Authentication">
            <React.Suspense
              fallback={<LoadingFallback message="Loading Authentication..." />}
            >
              <AuthMfeApp />
            </React.Suspense>
          </RemoteErrorBoundary>
        }
      />
    </Routes>
  );
}

export default App;
